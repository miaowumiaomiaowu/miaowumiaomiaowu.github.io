#!/usr/bin/env node
/**
 * Zotero Web API sync to Hugo content structure.
 * - Mirrors collections to content/notes/library/
 * - For each bibliographic item, generates a page bundle with index.md and meta.json
 * - Downloads annotated PDFs to static/notes/pdfs/<attachmentKey>.pdf when available
 * - Dry-run prints a summary and asks for confirmation before writing changes
 *
 * Requirements:
 * - Node >= 20 (global fetch available)
 * - Env: ZOTERO_API_KEY (do NOT commit it)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

// Load .env into process.env (no external deps)
await (async function loadEnvFile(){
  try {
    const envPath = path.join(process.cwd(), '.env');
    const raw = await fs.readFile(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      if (!line || /^\s*#/.test(line)) return;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) return;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    });
  } catch {}
})();

const USER_ID = process.env.ZOTERO_USER_ID || '16231093';
const USERNAME = process.env.ZOTERO_USERNAME || '';

const API_KEY = process.env.ZOTERO_API_KEY;
const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, 'content', 'notes', 'library');
const PDF_ROOT = path.join(ROOT, 'static', 'notes', 'pdfs');

const HUGO_BASE_PATH = '/notes/pdfs';
const ZOTERO_API = `https://api.zotero.org/users/${USER_ID}`;
const ZOTERO_HEADERS = {
  'Zotero-API-Version': '3',
  'Authorization': `Bearer ${API_KEY ?? ''}`,
};

if (!API_KEY) {
  console.error('ERROR: Please set ZOTERO_API_KEY environment variable.');
  process.exit(1);
}

function rlQuestion(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (ans) => { rl.close(); resolve(ans); }));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugify(input, fallback) {
  if (!input || !input.trim()) return fallback;
  // Keep CJK chars; replace spaces with dash; remove unsafe chars.
  const s = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    // Allow: a-z0-9, dash, underscore, dot, and CJK range
    .replace(/[^a-z0-9\-_.\u4e00-\u9fff]/g, '');
  return s || fallback;
}

function normalizeDate(raw) {
  if (!raw) return '';
  const d1 = new Date(raw);
  if (!Number.isNaN(d1.getTime())) return d1.toISOString();
  const m = String(raw).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2] || '01', 10) - 1;
    const da = parseInt(m[3] || '01', 10);
    const d = new Date(Date.UTC(y, mo, da));
    return d.toISOString();
  }
  return '';
}


async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function ensureCollectionIndex(pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  const dir = path.join(CONTENT_ROOT, ...parts);
  await ensureDir(dir);
  const idx = path.join(dir, '_index.md');
  try { await fs.access(idx); }
  catch {
    const title = parts[parts.length - 1] || '未命名';
    const fm = `---\n` +
      `title: ${title}\n` +
      `summary: ''\n` +
      `---\n\n` +
      `此处展示 ${title} 下的条目。\n`;
    await fs.writeFile(idx, fm, 'utf8');
  }
}

async function ensureHierarchyIndexes(pathStr) {
  const parts = pathStr.split('/').filter(Boolean);
  let acc = [];
  for (const p of parts) {
    acc.push(p);
    await ensureCollectionIndex(acc.join('/'));
  }
}


const ALLOWLIST_PATH = path.join(ROOT, '.notes-allowlist.json');

async function loadAllowlist() {
  try {
    const raw = await fs.readFile(ALLOWLIST_PATH, 'utf8');
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

async function saveAllowlist(set) {
  const arr = [...set].sort();
  await fs.writeFile(ALLOWLIST_PATH, JSON.stringify(arr, null, 2), 'utf8');
}


async function fetchAll(url, params = {}) {
  const limit = 100;
  let start = 0;
  const items = [];
  for (;;) {
    const u = new URL(url);
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('start', String(start));
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) {
        for (const vv of v) u.searchParams.append(k, String(vv));
      } else {
        u.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(u, { headers: ZOTERO_HEADERS });
    if (!res.ok) {
      let body = '';
      try { body = await res.text(); } catch {}
      throw new Error(`HTTP ${res.status} fetching ${u}\n${body.slice(0, 500)}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);

    const total = Number(res.headers.get('Total-Results') || '0');
    start += batch.length;
    if (start >= total) break;
    await sleep(50);
  }
  return items;
}

async function getCollections() {
  const cols = await fetchAll(`${ZOTERO_API}/collections`, { format: 'json' });
  const byKey = new Map();
  cols.forEach(c => byKey.set(c.key, c));
  // Build path by climbing parents
  function buildPath(key) {
    const names = [];
    let cur = byKey.get(key);
    const visited = new Set();
    while (cur) {
      if (visited.has(cur.key)) break; // guard cycles
      visited.add(cur.key);
      names.push(cur.data.name);
      const parentKey = cur.data.parentCollection || null;
      cur = parentKey ? byKey.get(parentKey) : null;
    }
    return names.reverse().join('/');
  }
  const withPath = cols.map(c => ({ key: c.key, name: c.data.name, parent: c.data.parentCollection || null, path: buildPath(c.key) }));
  return withPath;
}

async function getTopItemsInCollection(collectionKey) {
  // API: cannot specify itemType more than once. Use -attachment and filter notes/annotations client-side.
  const items = await fetchAll(`${ZOTERO_API}/collections/${collectionKey}/items`, {
    format: 'json',
    itemType: '-attachment',
    include: 'data',
    sort: 'dateModified',
    direction: 'desc',
  });
  return items.filter(it => {
    const t = (it?.data?.itemType || '').toLowerCase();
    return t !== 'note' && t !== 'annotation';
  });
}

async function getIndependentPdfAttachmentsInCollection(collectionKey) {
  // Fetch attachments that live directly under the collection (no parentItem)
  const atts = await fetchAll(`${ZOTERO_API}/collections/${collectionKey}/items`, {
    format: 'json',
    itemType: 'attachment',
    include: 'data',
    sort: 'dateModified',
    direction: 'desc',
  });
  return atts.filter(it => {
    const d = it?.data || {};
    const t = (d.itemType || '').toLowerCase();
    const ct = (d.contentType || '').toLowerCase();
    const fn = (d.filename || '').toLowerCase();
    const isPdf = ct.includes('pdf') || fn.endsWith('.pdf');
    const isTopLevel = !d.parentItem; // no parent -> independent
    return t === 'attachment' && isPdf && isTopLevel;
  });
}

async function getChildren(itemKey, itemType = '') {
  const params = { format: 'json', include: 'data' };
  if (itemType) params.itemType = itemType;
  return await fetchAll(`${ZOTERO_API}/items/${itemKey}/children`, params);
}

function pickPdfAttachment(children) {
  for (const c of children) {
    const d = c.data;
    if (d.itemType !== 'attachment') continue;
    const ct = (d.contentType || '').toLowerCase();
    if (ct.includes('pdf')) {
      return c;
    }
  }
  return null;
}

function pickSnapshotAttachment(children) {
  for (const c of children) {
    const d = c.data;
    if (d.itemType !== 'attachment') continue;
    const ct = (d.contentType || '').toLowerCase();
    const fn = (d.filename || '').toLowerCase();
    const lm = (d.linkMode || '').toLowerCase();
    if (ct.includes('html') || fn.endsWith('.html') || lm.includes('linked_url')) {
      return c;
    }
  }
  return null;
}


async function downloadAttachmentPDF(attachmentKey, targetPath) {
  const url = `${ZOTERO_API}/items/${attachmentKey}/file`;
  const res = await fetch(url, { headers: ZOTERO_HEADERS, redirect: 'follow' });
  if (res.status === 204) {
    // No file available (e.g., linked file or storage disabled)
    return false;
    }
  if (!res.ok) throw new Error(`Failed to download file for ${attachmentKey}: ${res.status}`);
  const ab = await res.arrayBuffer();
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, Buffer.from(ab));
  return true;
}

function buildWebLibraryItemURL({ username, userId, collectionKey, itemKey, attachmentKey }) {
  // Prefer username path if provided since user-friendly URLs require it for reader links
  if (username && collectionKey && itemKey && attachmentKey) {
    return `https://www.zotero.org/${username}/collections/${collectionKey}/items/${itemKey}/attachment/${attachmentKey}/reader`;
  }
  if (userId && itemKey) {
    return `https://www.zotero.org/users/${userId}/items/${itemKey}`;
  }
  return '';
}

function renderFrontMatter({ title, authors, tags, date, zoteroKey, collectionsPaths, pdfWebPath, snapshotLink }) {
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const yamlList = (arr) => (arr && arr.length ? arr.map(v => `- ${esc(v)}`).join('\n') : '');
  return `---\n` +
    `title: "${esc(title)}"\n` +
    `show_date: false\n` +
    (authors && authors.length ? `authors:\n${yamlList(authors)}\n` : '') +
    (date ? `date: "${esc(date)}"\n` : '') +
    (tags && tags.length ? `tags:\n${yamlList(tags)}\n` : '') +
    `zotero:\n  key: "${esc(zoteroKey)}"\n  collections:\n${collectionsPaths.map(p => `    - "${esc(p)}"`).join('\n')}\n` +
    (pdfWebPath ? `pdf: "${esc(pdfWebPath)}"\n` : '') +
    (snapshotLink ? `snapshot: "${esc(snapshotLink)}"\n` : '') +
    `---\n\n` +
    (pdfWebPath ? `{{< pdf src="${pdfWebPath}" >}}\n` : '_无可下载的 PDF（可能为链接文件或无权限）_\n') +
    (snapshotLink ? `\n[查看网页快照（含批注）](${snapshotLink})\n` : '');
}

async function main() {
  const LIBRARY_TYPE = 'users';
  console.log('Zotero sync started...');
  console.log(`User: ${USER_ID}`);
  const collections = await getCollections();
  if (!collections.length) {
    console.log('No collections found.');
  }
  // Prepare list of actions (collect but DO NOT write yet)
  const planned = [];
  const seenItems = new Map(); // itemKey -> itemData

  for (const col of collections) {
    const items = await getTopItemsInCollection(col.key);
    // regular bib items (exclude notes/annotations)
    for (const it of items) {
      const d = it.data;
      const itemKey = it.key;
      if (!seenItems.has(itemKey)) seenItems.set(itemKey, d);
      planned.push({ type: 'ITEM_IN_COLLECTION', collection: col, itemKey });
    }
    // independent PDF attachments
    const lonePdfs = await getIndependentPdfAttachmentsInCollection(col.key);
    for (const att of lonePdfs) {
      const d = att.data;
      const attKey = att.key; // use as itemKey surrogate
      if (!seenItems.has(attKey)) seenItems.set(attKey, d);
      planned.push({ type: 'INDEPENDENT_ATTACHMENT_IN_COLLECTION', collection: col, itemKey: attKey });
    }
  }

  // For each unique item (either bib item or independent attachment), fetch children/derive info
  const itemInfo = new Map();
  let downloadCount = 0;
  for (const [itemKey, d] of seenItems.entries()) {
    let pdfAtt = null, snapAtt = null;
    if ((d.itemType || '').toLowerCase() === 'attachment' && !d.parentItem) {
      // Independent attachment case
      pdfAtt = { key: d.key || itemKey, data: d };
    } else {
      const children = await getChildren(itemKey, 'attachment');
      pdfAtt = pickPdfAttachment(children);
      snapAtt = pickSnapshotAttachment(children);
    }

    let willDownload = false;
    let pdfWebPath = '';
    let pdfDiskPath = '';
    let snapshotLink = '';

    if (pdfAtt) {
      const pdfName = `${pdfAtt.key}.pdf`;
      pdfDiskPath = path.join(PDF_ROOT, pdfName);
      pdfWebPath = `${HUGO_BASE_PATH}/${pdfName}`;
      try { await fs.access(pdfDiskPath); }
      catch { downloadCount++; willDownload = true; }
    }

    if (snapAtt) {
      snapshotLink = buildWebLibraryItemURL({
        username: USERNAME,
        userId: USER_ID,
        collectionKey: d.parentCollection || (Array.isArray(d.collections) ? d.collections[0] : ''),
        itemKey: itemKey,
        attachmentKey: snapAtt.key,
      });
    }

    const authors = Array.isArray(d.creators) ? d.creators.map(c => [c.firstName, c.lastName].filter(Boolean).join(' ').trim()).filter(Boolean) : [];
    const tags = Array.isArray(d.tags) ? d.tags.map(t => t.tag).filter(Boolean) : [];

    // Title fallback: for independent attachment, use filename without extension
    const title = d.title || d.filename || '(无标题)';
    const dateStr = d.date || d.dateAdded || d.dateModified || '';

    itemInfo.set(itemKey, {
      title,
      date: dateStr,
      authors,
      tags,
      pdfAttKey: pdfAtt?.key || null,
      pdfWebPath,
      pdfDiskPath,
      snapshot: snapshotLink,
      isIndependentAttachment: (d.itemType || '').toLowerCase() === 'attachment' && !d.parentItem,
      willDownload,
    });
  }

  // Build membership: itemKey -> set of collection paths (still for all planned)
  const membership = new Map();
  for (const p of planned) {
    if (!membership.has(p.itemKey)) membership.set(p.itemKey, new Set());
    membership.get(p.itemKey).add(p.collection.path);
  }

  // Ask user to select collections to include (comma-separated prefixes), empty = all
  console.log('\n可选筛选：输入要同步的收藏夹路径前缀（逗号分隔），留空表示全部。例如：AI/LLM,Math');
  const selInput = (await rlQuestion('选择收藏夹（可留空）： ')).trim();
  let selectedKeys = new Set(seenItems.keys());
  if (selInput) {
    const prefixes = selInput.split(',').map(s => s.trim()).filter(Boolean);
    const keys = [];
    for (const [k, paths] of membership.entries()) {
      const has = [...paths].some(p => prefixes.some(pref => p.startsWith(pref)));
      if (has) keys.push(k);
    }
    selectedKeys = new Set(keys);
    if (selectedKeys.size === 0) {
      console.log('没有匹配到任何条目，已中止。');
      process.exit(0);
    }
  }

  // Prepare allowlist update and cleanup plan (only selected)
  const allowlist = await loadAllowlist();

  // Now write ONLY selected items; and only then create indices
  const pages = [];
  for (const action of planned) {
    const { collection, itemKey } = action;
    if (!selectedKeys.has(itemKey)) continue;
    const info = itemInfo.get(itemKey);
    await ensureHierarchyIndexes(collection.path);
    const title = info.title;
    const slug = slugify(title, itemKey);
    const dir = path.join(CONTENT_ROOT, collection.path, slug);
    pages.push({ dir, itemKey, collectionPath: collection.path, slug });
    allowlist.add(collection.path);
  }

  // Build membership for selected pages (for reporting only)
  const selectedMembership = new Map();
  for (const p of pages) {
    if (!selectedKeys.has(p.itemKey)) continue;
    if (!selectedMembership.has(p.itemKey)) selectedMembership.set(p.itemKey, new Set());
    selectedMembership.get(p.itemKey).add(p.collectionPath);
  }

  // Summary
  const uniqueItems = selectedKeys.size;
  const uniqueCollections = collections.length;
  const pageCount = pages.length;
  const plannedDownloads = [...itemInfo.entries()].filter(([k, v]) => selectedKeys.has(k) && v.willDownload).length;

  // Detect collections present on disk and plan cleanup (using allowlist)
  async function listDirs(root) {
    try { return (await fs.readdir(root, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name); } catch { return []; }
  }
  const firstLevel = await listDirs(CONTENT_ROOT);
  const cleanupTargets = [];
  for (const lv1 of firstLevel) {
    const p1 = path.join(CONTENT_ROOT, lv1);
    const lv2List = await listDirs(p1);
    if (!allowlist.has(lv1) && !lv2List.some(n => allowlist.has(`${lv1}/${n}`))) cleanupTargets.push(p1);
    for (const lv2 of lv2List) {
      const colPath = `${lv1}/${lv2}`;
      if (!allowlist.has(colPath)) cleanupTargets.push(path.join(p1, lv2));
    }
  }

  console.log(`\nDry-run Summary:`);
  console.log(`- Collections: ${uniqueCollections}`);
  console.log(`- Selected items: ${uniqueItems}`);
  console.log(`- Pages to (re)write: ${pageCount}`);
  console.log(`- PDFs to download: ${plannedDownloads}`);
  console.log(`- Collections to delete (never selected before): ${cleanupTargets.length}`);

  const ans = (await rlQuestion('Proceed with sync and cleanup? (y/N) ')).trim().toLowerCase();
  if (ans !== 'y' && ans !== 'yes') { console.log('Aborted by user.'); process.exit(0); }

  // Execute
  await ensureDir(CONTENT_ROOT);
  await ensureDir(PDF_ROOT);
  for (const dir of cleanupTargets) {
    try { await fs.rm(dir, { recursive: true, force: true }); console.log('Deleted collection:', path.relative(CONTENT_ROOT, dir)); } catch {}
  }
  await saveAllowlist(allowlist);

  // Download PDFs (only for selected)
  for (const [itemKey, info] of itemInfo.entries()) {
    if (!selectedKeys.has(itemKey)) continue;
    if (info.pdfAttKey && info.willDownload) {
      console.log(`Downloading PDF for ${itemKey} -> ${path.basename(info.pdfDiskPath)}`);
      try { await downloadAttachmentPDF(info.pdfAttKey, info.pdfDiskPath); }
      catch (e) { console.warn(`  ! Failed to download: ${e.message}`); }
      await sleep(50);
    }
  }

  // Write pages + meta (only for selected)
  for (const p of pages) {
    if (!selectedKeys.has(p.itemKey)) continue;
    const info = itemInfo.get(p.itemKey);
    const hasPdf = Boolean(info.pdfWebPath);
    const hasSnap = Boolean(info.snapshot);
    const summary = hasPdf && hasSnap ? '包含 PDF 与网页快照（含批注）' : hasPdf ? '包含 PDF' : hasSnap ? '包含网页快照（含批注）' : '元数据条目';

    const fm = renderFrontMatter({
      title: info.title,
      authors: info.authors,
      tags: info.tags,
      date: normalizeDate(info.date),
      zoteroKey: p.itemKey,
      collectionsPaths: [p.collectionPath],
      pdfWebPath: info.pdfWebPath || '',
      snapshotLink: info.snapshot || '',
    }) + `\n> ${summary}\n`;

    await ensureDir(p.dir);
    const indexPath = path.join(p.dir, 'index.md');
    const metaPath = path.join(p.dir, 'meta.json');
    await fs.writeFile(indexPath, fm, 'utf8');
    const meta = {
      title: info.title,
      authors: info.authors,
      tags: info.tags,
      date: info.date,
      zoteroKey: p.itemKey,
      collectionPath: p.collectionPath,
      slug: p.slug,
      pdf: info.pdfWebPath || '',
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  }

  console.log('Sync complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });

