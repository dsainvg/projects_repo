/**
 * state.js — Shared reactive application state
 *
 * Single source of truth for all mutable UI state.
 * Modules import and mutate this object directly.
 * No framework needed for this scale.
 */
export const state = {
  /** @type {object[]} All projects fetched + merged */
  allProjects: [],

  /** @type {object[]} Currently filtered + sorted subset */
  filteredProjects: [],

  /** @type {string} Active tag filter ('all' or a tag name) */
  activeTag: 'all',

  /** @type {'updated'|'created'|'name'|'stars'} Sort mode */
  sortMode: 'updated',

  /** @type {'grid'|'list'} Card view mode */
  viewMode: 'grid',

  /** @type {string} Current search query */
  searchQuery: '',

  /** @type {object|null} Currently selected project (for panel) */
  activeProject: null,

  /** @type {string|null} Current iframe URL */
  iframeUrl: null,

  /** @type {boolean} Has the API loaded? */
  loaded: false,
};
