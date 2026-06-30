/**
 * project-page.js — Logic for project.html
 *
 * URL: project.html?p=NERVI
 *
 * Loads:
 *  data/_settings.json           → lang colours
 *  data/projects/<name>.json     → project config
 *  GitHub API                    → stars, forks, dates, etc.
 *
 * Then renders the full project page.
 */

import { langIcon, formatName, timeAgo, toggleSubRepoElement } from './utils.js';

const GITHUB_USER = 'dsainvg';
const SETTINGS_URL = 'data/_settings.json';

/* ── Bootstrap ── */
(async function init() {
  let name = new URLSearchParams(location.search).get('p');
  if (!name) {
    const segments = location.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== 'project.html' && last !== 'index.html' && !last.endsWith('.html')) {
      name = last;
    }
  }

  if (!name) return showError('No project specified.');
  name = name.toLowerCase();

  // Update breadcrumb immediately
  document.getElementById('bcCurrent').textContent = formatName(name);
  document.title = `${formatName(name)} — Durga Sai`;

  try {
    const settings = await fetchJSON(SETTINGS_URL);
    if (settings.redirects && settings.redirects[name]) {
      const parent = settings.redirects[name];
      const targetUrl = location.protocol === 'file:'
        ? `project.html?p=${encodeURIComponent(parent)}`
        : `${encodeURIComponent(parent)}`;
      location.replace(targetUrl);
      return;
    }

    // Try to load cached project details from sessionStorage
    let project = null;
    try {
      const cached = sessionStorage.getItem(`project_${name}`);
      if (cached) {
        project = JSON.parse(cached);
        if (project.updatedAt) project.updatedAt = new Date(project.updatedAt);
        if (project.createdAt) project.createdAt = new Date(project.createdAt);
      }
    } catch (e) {
      console.warn('Failed to parse cached project', e);
    }

    if (!project) {
      const [cfg, ghData] = await Promise.all([
        fetchJSON(`data/projects/${name}/project.json`).catch(() => ({})),
        fetchJSON(`https://api.github.com/repos/${GITHUB_USER}/${name}`).catch(() => ({})),
      ]);

      project = mergeData(name, cfg, ghData, settings);

      try {
        sessionStorage.setItem(`project_${name}`, JSON.stringify(project));
      } catch (e) {
        console.warn('Failed to save project to cache', e);
      }
    }

    document.getElementById('pageMeta').content = project.shortDesc;
    document.getElementById('bcCurrent').textContent = project.displayName;
    document.title = `${project.displayName} — Durga Sai Projects`;

    renderPage(project);

    document.getElementById('ppLoading').style.display = 'none';
    document.getElementById('ppContent').classList.remove('hidden');

  } catch (err) {
    console.error(err);
    showError(`Could not load project "${name}": ${err.message}`);
  }

  bindNavbar();
  bindPdfModal();
})();

/* ── Merge config + GitHub API ── */
function mergeData(name, cfg, gh, settings) {
  const langColors = settings.langColors ?? {};
  const isExtra = settings.extraProjects && settings.extraProjects.includes(name);
  const defaultGithubUrl = isExtra ? null : `https://github.com/${GITHUB_USER}/${name}`;

  return {
    name,
    displayName: cfg.displayName ?? formatName(name),
    icon:       cfg.icon        ?? langIcon(gh.language),
    shortDesc:  cfg.shortDesc   ?? gh.description  ?? '',
    fullDesc:   cfg.fullDesc    ?? gh.description  ?? '',
    highlights: cfg.highlights  ?? [],
    techStack:  cfg.techStack   ?? [],
    tags:       cfg.tags        ?? [gh.language].filter(Boolean),
    links:      cfg.links       ?? null,
    liveUrl:    cfg.liveUrl     ?? gh.homepage      ?? null,
    docsUrl:    cfg.docsUrl     ?? null,
    reports:    cfg.reports     ?? [],
    timeline:   cfg.timeline    ?? [],
    subRepos:   cfg.subRepos    ?? [],
    subRepoOverviews: cfg.subRepoOverviews ?? {},
    githubUrl:  gh.html_url     ?? cfg.githubUrl ?? defaultGithubUrl,
    language:   gh.language     ?? null,
    langColor:  langColors[gh.language] ?? '#8b5cf6',
    stars:      gh.stargazers_count ?? 0,
    forks:      gh.forks_count      ?? 0,
    openIssues: gh.open_issues_count ?? 0,
    license:    gh.license?.spdx_id ?? null,
    archived:   gh.archived         ?? false,
    status:     cfg.status          ?? (gh.archived ? 'Archived' : 'Active'),
    featured:   cfg.featured        ?? false,
    updatedAt:  gh.updated_at ? new Date(gh.updated_at) : null,
    createdAt:  gh.created_at ? new Date(gh.created_at) : null,
  };
}

/* ── Render everything ── */
function renderPage(p) {
  renderHero(p);
  renderStatsBar(p);
  renderDesc(p);
  renderHighlights(p);
  renderReports(p);
  renderTimeline(p);
  renderTechStack(p);
  renderSubRepos(p);
  renderAllLinks(p);
  renderRepoStats(p);
}

/* ── Hero ── */
function renderHero(p) {
  document.getElementById('ppIcon').textContent = p.icon;
  document.getElementById('ppTitle').textContent = p.displayName;
  document.getElementById('ppShort').textContent = p.shortDesc;

  // Badges
  const langBadge = p.language
    ? `<span class="badge badge-lang" style="color:${p.langColor};background:${p.langColor}18;border-color:${p.langColor}33">${p.language}</span>` : '';
  const statusBadge = p.archived
    ? '<span class="badge badge-archived">Archived</span>'
    : '<span class="badge badge-active">● Active</span>';
  const liveBadge = p.liveUrl ? '<span class="badge badge-live">Live</span>' : '';
  const featBadge = p.featured ? '<span class="badge badge-featured">Featured</span>' : '';
  document.getElementById('ppBadges').innerHTML = featBadge + langBadge + liveBadge + statusBadge;

  // Tags
  document.getElementById('ppTags').innerHTML =
    p.tags.map(t => `<span class="pp-tag">${t}</span>`).join('');

  // Hero links — primary ones (live + github)
  const links = [];
  if (p.liveUrl) links.push(mkLink('Open Live', p.liveUrl, 'live'));
  if (p.githubUrl) links.push(mkLink('Source Code', p.githubUrl, 'github'));
  document.getElementById('ppHeroLinks').innerHTML = links.join('');
}

/* ── Stats bar ── */
function renderStatsBar(p) {
  const el = document.getElementById('ppStatsBar');
  const items = [
    statItem(starSvg(), 'Stars',    p.stars),
    statItem(forkSvg(), 'Forks',    p.forks),
    statItem(issueSvg(), 'Issues',  p.openIssues),
    p.license ? statItem(licenseSvg(), 'License', p.license) : null,
    p.updatedAt ? statItem(clockSvg(), 'Updated', timeAgo(p.updatedAt)) : null,
    p.createdAt ? statItem(calSvg(), 'Created',
      p.createdAt.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })) : null,
  ].filter(Boolean);
  el.innerHTML = items.join('');
}

function statItem(icon, label, val) {
  return `<div class="pp-stat-item">
    ${icon}
    <span>${label}</span>
    <span class="pp-stat-val">${val}</span>
  </div>`;
}

/* ── Description ── */
function renderDesc(p) {
  document.getElementById('ppDesc').innerHTML = formatDesc(p.fullDesc);
}

/* ── Highlights ── */
function renderHighlights(p) {
  const sec = document.getElementById('sec-highlights');
  if (!p.highlights.length) return;
  sec.style.display = '';
  document.getElementById('ppHighlights').innerHTML =
    p.highlights.map(h => `<li>${escHtml(h)}</li>`).join('');
}

/* ── Reports ── */
function renderReports(p) {
  const sec = document.getElementById('sec-reports');
  if (!p.reports.length) return;
  sec.style.display = '';

  document.getElementById('ppReportsGrid').innerHTML = p.reports.map(r => {
    const type = r.type ?? 'pdf';
    const typeLabel = { pdf: 'PDF', notebook: 'Notebook', link: 'Link' }[type] ?? type.toUpperCase();
    const typeClass = { pdf: '', notebook: 'notebook', link: 'link' }[type] ?? '';
    const typeIcon  = { pdf: pdfSvg(), notebook: notebookSvg(), link: extSvg() }[type] ?? pdfSvg();

    const filePath = `data/projects/${r.file}`;

    return `
      <div class="pp-report-card" data-file="${filePath}" data-title="${escHtml(r.title)}" data-type="${type}"
           role="button" tabindex="0" aria-label="Open ${escHtml(r.title)}">
        <span class="pp-report-type ${typeClass}">${typeIcon} ${typeLabel}</span>
        <div class="pp-report-title">${escHtml(r.title)}</div>
        ${r.desc ? `<div class="pp-report-desc">${escHtml(r.desc)}</div>` : ''}
        ${r.date ? `<div class="pp-report-date">${escHtml(r.date)}</div>` : ''}
      </div>`;
  }).join('');

  // Attach click handlers
  document.querySelectorAll('.pp-report-card').forEach(card => {
    const handler = () => openPreview(card.dataset.file, card.dataset.title, card.dataset.type);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });
}

/* ── Timeline ── */
function renderTimeline(p) {
  const sec = document.getElementById('sec-timeline');
  if (!p.timeline.length) return;
  sec.style.display = '';
  document.getElementById('ppTimeline').innerHTML =
    p.timeline.map(t => `
      <li>
        <span class="pp-tl-date">${escHtml(t.date)}</span>
        <span class="pp-tl-event">${escHtml(t.event)}</span>
      </li>`).join('');
}

/* ── Tech stack ── */
function renderTechStack(p) {
  const sec = document.getElementById('sec-tech');
  if (!p.techStack.length) return;
  sec.style.display = '';
  document.getElementById('ppTechGrid').innerHTML =
    p.techStack.map(t => `<span class="pp-tech-chip">${escHtml(t)}</span>`).join('');
}

/* ── Sub-repos ── */
function renderSubRepos(p) {
  const sec = document.getElementById('sec-subrepos');
  if (!p.subRepos.length) return;
  sec.style.display = '';
  
  const el = document.getElementById('ppSubRepos');
  el.innerHTML = p.subRepos.map(r => {
    const overview = p.subRepoOverviews?.[r] ?? '';
    return `
      <div class="subrepo-item">
        <button class="subrepo-header" data-repo="${r}" data-overview="${escHtml(overview)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" class="subrepo-chevron"><polyline points="9 18 15 12 9 6"/></svg>
          ${formatName(r)}
        </button>
        <div class="subrepo-body collapsed"></div>
      </div>
    `;
  }).join('');

  el.querySelectorAll('.subrepo-header').forEach(btn => {
    btn.addEventListener('click', () => toggleSubRepoElement(btn));
  });
}

/* ── All links (sidebar) ── */
function renderAllLinks(p) {
  const el = document.getElementById('ppAllLinks');
  const links = [];

  if (p.links?.length) {
    p.links.forEach(l => links.push(mkLink(l.label, l.url, l.type ?? 'external')));
  } else {
    if (p.liveUrl)  links.push(mkLink('Open Live', p.liveUrl, 'live'));
    if (p.docsUrl && p.docsUrl !== p.liveUrl) links.push(mkLink('Docs', p.docsUrl, 'docs'));
  }
  if (p.githubUrl) {
    links.push(mkLink('Source Code', p.githubUrl, 'github'));
  }

  el.innerHTML = `<div class="pp-all-links">${links.join('')}</div>`;

  // Bind click handlers to preview in iframe
  el.querySelectorAll('.dw-link').forEach(link => {
    const url = link.dataset.url;
    const type = link.dataset.type;
    const label = link.dataset.label;
    if (url) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openPreview(url, label, type);
      });
    }
  });
}

/* ── Repo stats (sidebar) ── */
function renderRepoStats(p) {
  const el = document.getElementById('ppRepoStats');
  const card = el.closest('.pp-sidebar-card');
  if (!p.githubUrl) {
    if (card) card.style.display = 'none';
    return;
  }
  if (card) card.style.display = '';

  const rows = [
    repoRow(githubSvg(), 'Repository', `<a href="${p.githubUrl}" target="_blank" rel="noopener" style="color:var(--accent-1)">${GITHUB_USER}/${p.name}</a>`),
    p.language ? repoRow('', 'Language', `<span style="color:${p.langColor}">${p.language}</span>`) : null,
    p.license  ? repoRow(licenseSvg(), 'License', p.license) : null,
    p.stars > 0 ? repoRow(starSvg(), 'Stars', p.stars) : null,
    p.forks > 0 ? repoRow(forkSvg(), 'Forks', p.forks) : null,
    p.updatedAt ? repoRow(clockSvg(), 'Updated', timeAgo(p.updatedAt)) : null,
  ].filter(Boolean);
  el.innerHTML = rows.join('');
}

function repoRow(icon, label, val) {
  return `<div class="pp-repo-row">
    <span class="pp-repo-row-label">${icon} ${label}</span>
    <span class="pp-repo-row-val">${val}</span>
  </div>`;
}

/* ── PDF, Markdown & General Preview Modal ── */
function openPreview(filePath, title, type) {
  const modal = document.getElementById('pdfModal');

  document.getElementById('pdfTitle').textContent = title;
  // Download button — only show for explicit downloadable assets (like PDFs)
  const downloadBtn = document.getElementById('pdfDownload');
  downloadBtn.href = filePath;
  
  if (type === 'pdf') {
    downloadBtn.style.display = '';
  } else {
    downloadBtn.style.display = 'none';
  }

  // New-tab button
  document.getElementById('pdfNewTab').href = filePath;

  if (type === 'markdown') {
    document.getElementById('markdownContent').innerHTML = '<div style="color:var(--text-3)">Loading report...</div>';
    document.getElementById('markdownContent').style.display = 'block';
    document.getElementById('pdfFrame').style.display = 'none';

    fetch(filePath)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} — ${filePath}`);
        return r.text();
      })
      .then(text => {
        document.getElementById('markdownContent').innerHTML = parseMarkdownToHtml(text);
      })
      .catch(err => {
        document.getElementById('markdownContent').innerHTML = `<div style="color:var(--red)">Failed to load report: ${err.message}</div>`;
      });
  } else {
    document.getElementById('markdownContent').style.display = 'none';
    document.getElementById('pdfFrame').style.display = 'block';
    if (type === 'pdf') {
      // Load PDF inline — append #toolbar=1&view=FitH to show browser PDF toolbar
      document.getElementById('pdfFrame').src = filePath + '#toolbar=1&navpanes=0&view=FitH';
    } else {
      // General website preview
      document.getElementById('pdfFrame').src = filePath;
    }
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  const modal = document.getElementById('pdfModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  setTimeout(() => {
    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('markdownContent').innerHTML = '';
  }, 300);
}

/** Regex-based custom Markdown-to-HTML parser */
function parseMarkdownToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let listType = '';
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeLines = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code class="language-${codeBlockLang}">${escHtml(codeLines.join('\n'))}</code></pre>`;
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith('|')) {
      inTable = true;
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isDivider = cells.every(c => /^:\-*|^\-*|^\-+:*|^\-+:$/.test(c));
      if (isDivider) continue;

      if (tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      html += `<table>
        <thead>
          <tr>${tableHeaders.map(h => `<th>${parseInlineMarkdown(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${tableRows.map(row => `<tr>${row.map(cell => `<td>${parseInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>`;
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }

    // Lists
    const ulMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) html += `</${listType}>`;
        html += '<ul>';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${parseInlineMarkdown(ulMatch[2])}</li>`;
      continue;
    } else if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) html += `</${listType}>`;
        html += '<ol>';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${parseInlineMarkdown(olMatch[2])}</li>`;
      continue;
    } else if (inList && line.trim() === '') {
      html += `</${listType}>`;
      inList = false;
      continue;
    } else if (inList && !line.startsWith(' ') && !line.startsWith('\t')) {
      html += `</${listType}>`;
      inList = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      html += `<h1>${parseInlineMarkdown(line.slice(2))}</h1>`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2>${parseInlineMarkdown(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3>${parseInlineMarkdown(line.slice(4))}</h3>`;
      continue;
    }

    // Blockquotes
    if (line.trim().startsWith('>')) {
      html += `<blockquote>${parseInlineMarkdown(line.trim().slice(1).trim())}</blockquote>`;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      html += '<hr>';
      continue;
    }

    // Paragraph
    if (line.trim() !== '') {
      html += `<p>${parseInlineMarkdown(line)}</p>`;
    }
  }

  if (inTable) {
    html += `<table>
      <thead>
        <tr>${tableHeaders.map(h => `<th>${parseInlineMarkdown(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${tableRows.map(row => `<tr>${row.map(cell => `<td>${parseInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>`;
  }
  if (inList) {
    html += `</${listType}>`;
  }

  return html;
}

function parseInlineMarkdown(text) {
  if (!text) return '';
  let s = text;
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  s = s.replace(/`(.*?)`/g, '<code>$1</code>');
  s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return s;
}

function bindPdfModal() {
  document.getElementById('pdfClose')?.addEventListener('click', closePreview);
  document.getElementById('pdfBackdrop')?.addEventListener('click', closePreview);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('pdfModal').classList.contains('open')) closePreview();
  });
}

/* ── Error state ── */
function showError(msg) {
  document.getElementById('ppLoading').style.display = 'none';
  document.getElementById('ppError').classList.remove('hidden');
  document.getElementById('ppErrorMsg').textContent = msg;
}

/* ── Navbar scroll ── */
function bindNavbar() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

/* ── Helpers ── */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} — ${url}`);
  return res.json();
}

function formatDesc(text) {
  if (!text) return '';
  return text.split(/\n\n+/).map(block => {
    const lines = block.split('\n');
    const isList = lines.every(l => /^[•\-\*]\s/.test(l.trim()));
    if (isList) {
      return `<ul>${lines.map(l => `<li>${escHtml(l.trim().replace(/^[•\-\*]\s/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(escHtml).join('<br>')}</p>`;
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Link builder ── */
function mkLink(label, url, type) {
  const cls = { live:'dw-link-live', docs:'dw-link-docs', github:'dw-link-github', preview:'dw-link-preview', external:'dw-link-external' }[type] ?? 'dw-link-external';
  const icon = { live:externalSvg(), docs:docSvg(), github:githubSvg(), preview:monitorSvg(), external:externalSvg() }[type] ?? externalSvg();
  
  if (type === 'github' || url.includes('pypi.org') || label.toLowerCase().includes('pypi')) {
    return `<a href="${url}" class="dw-link ${cls}" target="_blank" rel="noopener noreferrer">${icon} ${label}</a>`;
  }
  return `<a href="${url}" class="dw-link ${cls}" data-url="${url}" data-type="${type}" data-label="${escHtml(label)}">${icon} ${label}</a>`;
}

/* ── Inline SVGs ── */
const mk = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">${body}</svg>`;
const starSvg    = () => `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
const forkSvg    = () => mk('<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M6 9v3a6 6 0 0 0 6 6M18 9v3"/>');
const issueSvg   = () => mk('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>');
const clockSvg   = () => mk('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
const calSvg     = () => mk('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>');
const licenseSvg = () => mk('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
const githubSvg  = () => `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`;
const externalSvg= () => mk('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>');
const docSvg     = () => mk('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>');
const monitorSvg = () => mk('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>');
const subSvg     = () => mk('<path d="m18 15-6-6-6 6"/>');
const pdfSvg     = () => mk('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>');
const notebookSvg= () => mk('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>');
const extSvg     = () => externalSvg();
