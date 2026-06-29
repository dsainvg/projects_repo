/**
 * render.js — Card rendering (grid + list view)
 *
 * Reads from state.filteredProjects and writes to #projectsGrid.
 * Also handles the skeleton loader and empty state.
 */

import { state } from './state.js';
import { openPanel } from './panel.js';
import { timeAgo, formatName } from './utils.js';

/**
 * Render the current filteredProjects into the grid.
 */
export function renderCards() {
  const grid  = document.getElementById('projectsGrid');
  const empty = document.getElementById('emptyState');

  if (state.filteredProjects.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.className = 'projects-grid' + (state.viewMode === 'list' ? ' list-view' : '');

  // Use DocumentFragment for performance
  const frag = document.createDocumentFragment();
  state.filteredProjects.forEach((project, idx) => {
    frag.appendChild(createCard(project, idx));
  });

  grid.innerHTML = '';
  grid.appendChild(frag);
}

/**
 * Build a single project card element.
 * @param {object} p    Project data object
 * @param {number} idx  Position in list (for animation delay)
 * @returns {HTMLElement}
 */
function createCard(p, idx) {
  const card = document.createElement('article');
  card.className = [
    'proj-card',
    p.archived ? 'archived' : '',
  ].filter(Boolean).join(' ');
  card.style.animationDelay = `${Math.min(idx * 35, 350)}ms`;
  card.dataset.name = p.name;
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${p.displayName} — ${p.desc}`);

  card.innerHTML = buildCardHTML(p);

  card.addEventListener('click', () => openPanel(p));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(p); }
  });

  return card;
}

/**
 * Build the inner HTML for a card.
 * @param {object} p
 * @returns {string}
 */
function buildCardHTML(p) {
  const ago = timeAgo(p.updatedAt);

  const langBadge = p.language
    ? `<span class="badge badge-lang" style="color:${p.langColor};background:${p.langColor}18;border-color:${p.langColor}33">${p.language}</span>`
    : '';

  const statusBadge = p.archived
    ? `<span class="badge badge-archived">Archived</span>`
    : `<span class="badge badge-active">● Active</span>`;

  const liveBadge = p.liveUrl
    ? `<span class="badge badge-live">Live</span>`
    : '';

  const featBadge = p.featured && !p.archived
    ? `<span class="badge badge-featured">Featured</span>`
    : '';

  const tagChips = p.tags.slice(0, 4)
    .map(t => `<span class="tag-chip">${t}</span>`)
    .join('');

  const starsHtml = p.stars > 0
    ? `<span class="meta-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        ${p.stars}
      </span>`
    : '';

  return `
    <div class="card-top">
      <div class="card-icon" aria-hidden="true">${p.icon}</div>
      <div class="card-badges">
        ${featBadge}
        ${langBadge}
        ${liveBadge}
        ${statusBadge}
      </div>
    </div>

    <div class="card-name">${p.displayName}</div>
    <p class="card-desc">${p.desc}</p>

    <div class="card-tags">${tagChips}</div>

    <div class="card-footer">
      <div class="card-meta">
        ${starsHtml}
        <span class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          ${ago}
        </span>
      </div>
      <span class="card-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </span>
    </div>
  `;
}

/**
 * Set the view mode and re-render.
 * @param {'grid'|'list'} mode
 */
export function setViewMode(mode) {
  state.viewMode = mode;
  document.getElementById('btnGrid').classList.toggle('active', mode === 'grid');
  document.getElementById('btnList').classList.toggle('active', mode === 'list');
  document.getElementById('btnGrid').setAttribute('aria-pressed', mode === 'grid' ? 'true' : 'false');
  document.getElementById('btnList').setAttribute('aria-pressed', mode === 'list' ? 'true' : 'false');
  renderCards();
}
