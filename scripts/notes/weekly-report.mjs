#!/usr/bin/env node
/**
 * Weekly report generator (Chinese)
 * - Scans content/notes/library/**/meta.json
 * - Selects items created/updated within the last ISO week (Mon-based)
 * - Emits content/notes/weekly/YYYY-Www.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// Load .env if present
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

const ROOT = process.cwd();
const LIB_ROOT = path.join(ROOT, 'content', 'notes', 'library');
const WEEKLY_ROOT = path.join(ROOT, 'content', 'notes', 'weekly');

function startOfISOWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7; // 1..7, Mon=1
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date;
}

function isoWeekYear(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
}

function isoWeekNumber(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

async function collectMetaFiles(dir) {
  const out = [];
  async function walk(d) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && e.name === 'meta.json') {
        out.push(p);
      }
    }
  }
  try { await walk(dir); } catch {}
  return out;
}

async function readJSON(p) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return null; }
}

function withinWeek(isoStart, isoEnd, updatedAt) {
  const t = new Date(updatedAt).getTime();
  return t >= isoStart.getTime() && t < isoEnd.getTime();
}

function renderWeekly({ year, week, items }) {
  const title = `学习周报 ${year}-W${String(week).padStart(2, '0')}`;
  const lines = [];
  lines.push('---');
  lines.push(`title: ${title}`);
  lines.push(`date: ${startOfISOWeek(new Date()).toISOString()}`);
  lines.push('tags:');
  lines.push('- weekly');
  lines.push('- notes');
  lines.push('---');
  lines.push('');
  lines.push('## 本周概览');
  lines.push(`- 新增/更新条目：${items.length} 篇`);
  lines.push('');
  lines.push('## 条目明细');
  for (const it of items) {
    lines.push(`- 【${it.collectionPath}】${it.title} — ${it.authors?.join(', ') || ''}`);
    if (it.pdf) lines.push(`  - PDF：${it.pdf}`);
    if (it.snapshot) lines.push(`  - 快照：${it.snapshot}`);
    lines.push(`  - 标签：${(it.tags || []).join(', ')}`);
  }
  lines.push('');
  lines.push('## 我的补充说明');
  lines.push('在这里添加你的本周总结、思考与待办。');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const now = new Date();
  const year = isoWeekYear(now);
  const week = isoWeekNumber(now);
  const weekStart = startOfISOWeek(now);
  const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  const metaFiles = await collectMetaFiles(LIB_ROOT);
  const metas = (await Promise.all(metaFiles.map(readJSON))).filter(Boolean);
  const picked = metas.filter(m => m.updatedAt && withinWeek(weekStart, weekEnd, m.updatedAt));
  picked.sort((a, b) => (a.collectionPath || '').localeCompare(b.collectionPath || ''));

  const md = renderWeekly({ year, week, items: picked });
  await fs.mkdir(WEEKLY_ROOT, { recursive: true });
  const outPath = path.join(WEEKLY_ROOT, `${year}-W${String(week).padStart(2, '0')}.md`);
  await fs.writeFile(outPath, md, 'utf8');
  console.log('Weekly report generated:', path.relative(ROOT, outPath));
}

main().catch((e) => { console.error(e); process.exit(1); });

