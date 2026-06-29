/**
 * panel.js — Project detail modal controller
 *
 * Opens a popup modal when a card is clicked, showing full project
 * info: description, all links, sub-repos, stats.
 *
 * JSON schema for links (in data/projects/<name>.json):
 *   "links": [
 *     { "label": "Live Site",  "url": "https://...", "type": "live" },
 *     { "label": "Docs",       "url": "https://...", "type": "docs" },
 *     { "label": "Preview",    "url": "https://...", "type": "preview" },
 *     { "label": "Paper",      "url": "https://...", "type": "external" }
 *   ]
 * type options: "live" | "docs" | "preview" | "github" | "external"
 */

import { state }            from './state.js';
import { loadIframe }       from './iframe.js';
import { formatName, timeAgo, toggleSubRepoElement } from './utils.js';

const modal    = () => document.getElementById('detailModal');
const backdrop = () => document.getElementById('detailBackdrop');

/* ── Open the detail modal for a project ── */
export function openPanel(project) {
  state.activeProject = project;

  fillIcon(project);
  fillBadges(project);
  fillTitle(project);
  fillTags(project);
  fillDesc(project);
  fillLinks(project);
  fillSubRepos(project);
  fillStats(project);

  modal().classList.add('open');
  modal().setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Scroll body back to top
  document.querySelector('.dw-body')?.scrollTo(0, 0);
}

/* ── Close ── */
export function closePanel() {
  state.activeProject = null;
  modal().classList.remove('open');
  modal().setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ── Fill helpers ── */

function fillIcon(p) {
  document.getElementById('dwIcon').textContent = p.icon;
}

function fillBadges(p) {
  const el = document.getElementById('dwBadges');
  const langBadge = p.language
    ? `<span class="badge badge-lang" style="color:${p.langColor};background:${p.langColor}18;border-color:${p.langColor}33">${p.language}</span>`
    : '';
  const statusBadge = p.archived
    ? `<span class="badge badge-archived">Archived</span>`
    : `<span class="badge badge-active">● Active</span>`;
  const liveBadge = p.liveUrl
    ? `<span class="badge badge-live">Live</span>` : '';
  const featBadge = p.featured && !p.archived
    ? `<span class="badge badge-featured">Featured</span>` : '';
  el.innerHTML = featBadge + langBadge + liveBadge + statusBadge;
}

function fillTitle(p) {
  document.getElementById('dwTitle').textContent = p.displayName;
}

function fillTags(p) {
  const el = document.getElementById('dwTags');
  el.innerHTML = p.tags.map(t => `<span class="dw-tag">${t}</span>`).join('');
}

function fillDesc(p) {
  const el = document.getElementById('dwDesc');
  el.innerHTML = formatDesc(p.fullDesc);
}

/** Convert plain text with newlines and • bullets into HTML */
function formatDesc(text) {
  if (!text) return '';
  // Split on double-newlines for paragraphs
  const blocks = text.split(/\n\n+/);
  return blocks.map(block => {
    const lines = block.split('\n');
    // If all lines in a block start with • or -, render as a <ul>
    const isList = lines.every(l => /^[•\-\*]\s/.test(l.trim()));
    if (isList) {
      const items = lines
        .map(l => `<li>${escHtml(l.trim().replace(/^[•\-\*]\s/, ''))}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${lines.map(escHtml).join('<br>')}</p>`;
  }).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fillLinks(p) {
  const el = document.getElementById('dwLinks');
  const links = [];

  const projectUrl = location.protocol === 'file:'
    ? `project.html?p=${encodeURIComponent(p.name)}`
    : `${encodeURIComponent(p.name)}`;

  links.push(`<a href="${projectUrl}" class="dw-link dw-link-fullpage">
    ${pageSvg()} Full Details Page
  </a>`);

  // Priority 1: explicit links array from JSON
  if (p.links?.length) {
    p.links.forEach(l => {
      links.push(buildLink(l.label, l.url, l.type ?? 'external'));
    });
  } else {
    // Fallback: build from individual fields
    if (p.liveUrl) {
      links.push(buildLink('Open Live', p.liveUrl, 'live'));
    }
    if (p.docsUrl && p.docsUrl !== p.liveUrl) {
      links.push(buildLink('Docs', p.docsUrl, 'docs'));
    }
  }

  // Always include GitHub
  links.push(buildLink('Source Code', p.githubUrl, 'github'));

  el.innerHTML = links.join('');

  // Bind iframe preview triggers
  el.querySelectorAll('.dw-link').forEach(link => {
    const url = link.dataset.url;
    if (url) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.__app.loadIframe(url);
      });
    }
  });
}

function fillSubRepos(p) {
  const section = document.getElementById('dwSubSection');
  const el      = document.getElementById('dwSubRepos');

  if (!p.subRepos?.length) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  el.innerHTML = p.subRepos.map(r => `
    <div class="subrepo-item">
      <button class="subrepo-header" data-repo="${r}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" class="subrepo-chevron"><polyline points="9 18 15 12 9 6"/></svg>
        ${formatName(r)}
      </button>
      <div class="subrepo-body collapsed"></div>
    </div>
  `).join('');

  el.querySelectorAll('.subrepo-header').forEach(btn => {
    btn.addEventListener('click', () => toggleSubRepoElement(btn));
  });
}

function fillStats(p) {
  const el = document.getElementById('dwStats');
  const chips = [
    statChip(clockSvg(), `Updated ${timeAgo(p.updatedAt)}`),
    p.stars > 0   ? statChip(starSvg(),  `${p.stars} stars`)         : '',
    p.forks > 0   ? statChip(forkSvg(),  `${p.forks} forks`)         : '',
    p.license     ? statChip('',          p.license)                  : '',
    p.openIssues > 0 ? statChip('',      `${p.openIssues} issues`)   : '',
  ].filter(Boolean);
  el.innerHTML = chips.join('');
}

/* ── Link builders ── */
function buildLink(label, url, type) {
  const cls = {
    live:     'dw-link-live',
    docs:     'dw-link-docs',
    github:   'dw-link-github',
    preview:  'dw-link-preview',
    external: 'dw-link-external',
  }[type] ?? 'dw-link-external';

  const icon = {
    live:     externalSvg(),
    docs:     docSvg(),
    github:   githubSvg(),
    preview:  monitorSvg(),
    external: externalSvg(),
  }[type] ?? externalSvg();

  if (type === 'github' || url.includes('pypi.org') || label.toLowerCase().includes('pypi')) {
    return `<a href="${url}" class="dw-link ${cls}" target="_blank" rel="noopener noreferrer">${icon} ${label}</a>`;
  }
  return `<a href="${url}" class="dw-link ${cls}" data-url="${url}" data-type="${type}" data-label="${escHtml(label)}">${icon} ${label}</a>`;
}

function statChip(icon, text) {
  return `<span class="dw-stat">${icon} ${text}</span>`;
}

/* ── Bind events ── */
export function bindPanelClose() {
  document.getElementById('detailClose')?.addEventListener('click', closePanel);
  backdrop()?.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal()?.classList.contains('open')) closePanel();
  });
}

/* ── Inline SVG helpers ── */
const mk = (body, opts = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true" ${opts}>${body}</svg>`;

const clockSvg    = () => mk('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
const starSvg     = () => `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
const forkSvg     = () => mk('<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M6 9v3a6 6 0 0 0 6 6M18 9v3"/>');
const githubSvg   = () => `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;
const monitorSvg  = () => mk('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>');
const externalSvg = () => mk('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>');
const docSvg      = () => mk('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
const subSvg      = () => mk('<path d="m18 15-6-6-6 6"/>');
const pageSvg     = () => mk('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>');
