/**
 * main.js — Application entry point
 *
 * Imports all modules and wires everything together.
 * This is the only file loaded by index.html (as type="module").
 *
 * Module responsibilities:
 *  projects.config.js  →  edit projects here
 *  api.js              →  GitHub fetch + data merge
 *  state.js            →  shared app state
 *  filters.js          →  tag chips, search, sort
 *  render.js           →  card grid rendering
 *  panel.js            →  detail side panel
 *  iframe.js           →  live preview iframe
 *  utils.js            →  pure helpers
 */

import { fetchRepos }       from './api.js';
import { state }            from './state.js';
import { buildTagFilters, bindSearch, bindSortSelect, applyFilters, resetSearch } from './filters.js';
import { renderCards, setViewMode } from './render.js';
import { bindPanelClose }   from './panel.js';
import { bindIframeControls, loadIframe } from './iframe.js';

/* ── Bootstrap on DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindNavbar();
  bindViewToggle();
  bindSearch();
  bindSortSelect();
  bindPanelClose();
  bindIframeControls();

  // Expose minimal API to HTML (for onclick handlers in injected HTML)
  window.__app = { resetSearch, loadIframe };

  // Fetch repos and render
  await fetchRepos(onDataReady, onDataError);
}

/* ── Called when GitHub data is ready ── */
function onDataReady(projects) {
  buildTagFilters(projects);
  applyFilters();          // initial render (no filter applied yet)
}

/* ── Called if GitHub API fails ── */
function onDataError(err) {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-3)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
           width="48" height="48" style="margin:0 auto 16px;display:block;opacity:.4">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p style="font-size:15px;margin-bottom:8px">Could not load projects</p>
      <p style="font-size:13px;opacity:.6">
        Check your connection or
        <a href="https://github.com/dsainvg" target="_blank"
           style="color:var(--accent-1)">view repos on GitHub →</a>
      </p>
    </div>`;
}

/* ── Navbar scroll effect ── */
function bindNavbar() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

/* ── Grid / List view toggle ── */
function bindViewToggle() {
  document.getElementById('btnGrid').addEventListener('click', () => setViewMode('grid'));
  document.getElementById('btnList').addEventListener('click', () => setViewMode('list'));
}
