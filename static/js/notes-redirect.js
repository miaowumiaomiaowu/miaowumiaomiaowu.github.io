// Only run on Notes subtree pages. Redirect empty section/list pages to first leaf.
(function(){
  function isNotesPath(){ return location.pathname.startsWith('/notes/'); }
  function hasProseContent(){
    var prose = document.querySelector('article .prose, main .prose');
    if(!prose) return false;
    var t = (prose.textContent || '').trim();
    return t.length > 0;
  }
  function firstChildHrefFromSidebar(){
    var sidebar = document.querySelector('.hb-sidebar-container');
    if(!sidebar) return null;
    // Prefer the active section's first child; fall back to the first link
    var active = sidebar.querySelector('a.sidebar-active-item');
    var container = active && active.nextElementSibling;
    var firstLink = (container && container.querySelector('.hb-sidebar-list a[href]'))
                    || sidebar.querySelector('.hb-sidebar-list a[href]');
    return firstLink ? firstLink.getAttribute('href') : null;
  }
  function maybeRedirect(){
    if(!isNotesPath()) return;
    // If we already have content, do nothing
    if(hasProseContent()) return;
    var href = firstChildHrefFromSidebar();
    if(href && href !== location.pathname){
      location.replace(href);
    }
  }
  if(document.readyState !== 'loading') maybeRedirect();
  else document.addEventListener('DOMContentLoaded', maybeRedirect);
})();

