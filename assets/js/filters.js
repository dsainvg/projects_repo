/**
 * filters.js — Tag chips, search, sort logic
 *
 * Handles:
 *  - Building the tag filter pill buttons
 *  - Filtering projects by tag + search query
 *  - Sorting the filtered list
 */

import { state } from './state.js';
import { renderCards } from './render.js';

/* ── Build tag buttons from loaded projects ── */
export function buildTagFilters(projects) {
  const tagCount = {};
  projects.forEach(p => {
    p.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
  });

  // Top 10 tags by frequency
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);

  const container = document.getElementById('tagFilters');
  container.innerHTML = `
    <button class="tag-btn active" data-tag="all" id="tag-btn-all">
      All <span class="tag-count">(${projects.length})</span>
    </button>
  `;

  topTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.dataset.tag = tag;
    btn.textContent = tag;
    btn.id = `tag-btn-${tag.toLowerCase().replace(/\s+/g, '-')}`;
    btn.addEventListener('click', () => selectTag(tag));
    container.appendChild(btn);
  });

  document.getElementById('tag-btn-all').addEventListener('click', () => selectTag('all'));
}

/* ── Select a tag ── */
export function selectTag(tag) {
  state.activeTag = tag;

  document.querySelectorAll('.tag-btn').forEach(btn => {
    const active = btn.dataset.tag === tag;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  applyFilters();
}

/* ── Apply current search + tag filter, then sort + render ── */
export function applyFilters() {
  const q = state.searchQuery.toLowerCase();

  state.filteredProjects = state.allProjects.filter(p => {
    const matchTag = state.activeTag === 'all' || p.tags.includes(state.activeTag);
    const matchSearch = !q
      || p.name.toLowerCase().includes(q)
      || p.desc.toLowerCase().includes(q)
      || p.tags.some(t => t.toLowerCase().includes(q))
      || (p.language?.toLowerCase().includes(q));
    return matchTag && matchSearch;
  });

  sortProjects();
  renderCards();
}

/* ── Sort filteredProjects in-place ── */
export function sortProjects() {
  const mode = state.sortMode;

  state.filteredProjects.sort((a, b) => {
    switch (mode) {
      case 'updated': return b.updatedAt - a.updatedAt;
      case 'created': return b.createdAt - a.createdAt;
      case 'stars':   return b.stars - a.stars;
      case 'name':    return a.name.localeCompare(b.name);
      default:        return 0;
    }
  });

  // Featured projects bubble to top only in the default "All" / no-search view
  if (state.activeTag === 'all' && !state.searchQuery) {
    state.filteredProjects.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
}

/* ── Bind sort select ── */
export function bindSortSelect() {
  const sel = document.getElementById('sortSel');
  sel.addEventListener('change', () => {
    state.sortMode = sel.value;
    sortProjects();
    renderCards();
  });
}

/* ── Bind search input ── */
export function bindSearch() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => {
    state.searchQuery = input.value.trim();
    applyFilters();
  });
}

/* ── Reset search (called from HTML button) ── */
export function resetSearch() {
  state.searchQuery = '';
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  applyFilters();
}
