/**
 * api.js — GitHub API fetch + JSON data loader
 *
 * Flow:
 *  1. Load data/_settings.json         (lang colours, excluded repos)
 *  2. Fetch GitHub repos for GITHUB_USER
 *  3. For each repo, try to fetch      data/projects/{repoName}/project.json
 *     → if the file exists, merge it in
 *     → if not, fall back to raw GitHub API data
 *  4. Filter out excluded / sub repos
 *  5. Update stats, call onSuccess
 *
 * ─────────────────────────────────────────────────────────────
 *  To add or edit a project:  create/edit data/projects/<repoName>/project.json
 *  To add reports:            drop PDFs in data/projects/<repoName>/reports/
 *  To change colours / exclusions:  edit data/_settings.json
 * ─────────────────────────────────────────────────────────────
 */

import { state }              from './state.js';
import { langIcon, animateCount, formatName } from './utils.js';

const GITHUB_USER   = 'dsainvg';
const GITHUB_API    = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`;
const SETTINGS_URL  = 'data/_settings.json';
const PROJECT_BASE  = 'data/projects/';

/* ── Public entry point ── */
export async function fetchRepos(onSuccess, onError) {
  try {
    // Try to load cached repository list from sessionStorage
    try {
      const cached = sessionStorage.getItem('allProjects');
      const cachedTotal = sessionStorage.getItem('totalReposCount');
      if (cached && cachedTotal) {
        const projects = JSON.parse(cached);
        projects.forEach(p => {
          if (p.updatedAt) p.updatedAt = new Date(p.updatedAt);
          if (p.createdAt) p.createdAt = new Date(p.createdAt);
        });
        state.allProjects      = projects;
        state.filteredProjects = [...projects];
        state.loaded           = true;
        updateStats(projects, parseInt(cachedTotal, 10));
        onSuccess(projects);
        return;
      }
    } catch (e) {
      console.warn('Failed to parse cached repositories list', e);
    }

    // 1. Load settings + GitHub repos in parallel
    const [settings, repos] = await Promise.all([
      fetchJSON(SETTINGS_URL),
      fetchJSON(GITHUB_API),
    ]);

    const { excludedRepos = [], extraProjects = [], langColors = {}, redirects = {} } = settings;

    // 2. Try to load a JSON file for every repo + extra projects (ignore 404s)
    const projectJSONs = await loadProjectFiles(repos, excludedRepos, extraProjects, redirects);

    // 3. Merge API data with project JSON overrides
    const projects = mergeProjects(repos, projectJSONs, langColors, excludedRepos, redirects);

    state.allProjects      = projects;
    state.filteredProjects = [...projects];
    state.loaded           = true;

    // Save to sessionStorage cache
    try {
      sessionStorage.setItem('allProjects', JSON.stringify(projects));
      sessionStorage.setItem('totalReposCount', repos.length.toString());
    } catch (e) {
      console.warn('Failed to save repositories list to cache', e);
    }

    updateStats(projects, repos.length);
    onSuccess(projects);

  } catch (err) {
    console.error('[api.js] Fatal error:', err);
    onError(err);
  }
}

/* ── Load all project JSON files in parallel ── */
async function loadProjectFiles(repos, excludedRepos, extraProjects = [], redirects = {}) {
  const names = repos
    .filter(r => !excludedRepos.includes(r.name))
    .map(r => redirects[r.name] ?? r.name)
    .concat(extraProjects);

  const uniqueNames = [...new Set(names)];

  const results = await Promise.allSettled(
    uniqueNames.map(async name => {
      const data = await fetchJSON(`${PROJECT_BASE}${name}/project.json`).catch(() => null);
      return { repoName: name, data };
    })
  );

  // Build a map: repoName → project JSON (or null if file doesn't exist)
  const map = {};
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value && r.value.data) {
      map[r.value.repoName] = r.value.data;
    }
  });
  return map;
}

/* ── Merge GitHub API repo + project JSON override ── */
function mergeProjects(repos, projectJSONs, langColors, excludedRepos, redirects = {}) {
  const mergedNames = new Set();
  const list = repos
    .filter(repo => !excludedRepos.includes(repo.name))
    .map(repo => {
      const mappedName = redirects[repo.name] ?? repo.name;
      const cfg = projectJSONs[mappedName] ?? {};
      mergedNames.add(mappedName);

      return {
        id:         repo.id,
        name:       mappedName,
        fullName:   repo.full_name,
        displayName: cfg.displayName ?? formatName(mappedName),
        desc:       cfg.shortDesc   ?? repo.description  ?? 'No description available.',
        fullDesc:   cfg.fullDesc    ?? repo.description  ?? 'No description available.',
        icon:       cfg.icon        ?? langIcon(repo.language),
        tags:       cfg.tags        ?? [repo.language].filter(Boolean),
        language:   repo.language   ?? null,
        langColor:  langColors[repo.language] ?? '#8b5cf6',
        liveUrl:    cfg.liveUrl     ?? repo.homepage     ?? null,
        docsUrl:    cfg.docsUrl     ?? null,
        links:      cfg.links       ?? null,   // optional: array of {label, url, type}
        githubUrl:  repo.html_url,
        subRepos:   cfg.subRepos    ?? [],
        subRepoOverviews: cfg.subRepoOverviews ?? {},
        stars:      repo.stargazers_count,
        forks:      repo.forks_count,
        archived:   repo.archived,
        status:     cfg.status      ?? (repo.archived ? 'Archived' : 'Active'),
        featured:   cfg.featured    ?? false,
        openIssues: repo.open_issues_count,
        license:    repo.license?.spdx_id ?? null,
        updatedAt:  new Date(repo.updated_at),
        createdAt:  new Date(repo.created_at),
      };
    });

  // Append extra projects that are not on GitHub
  Object.keys(projectJSONs).forEach(name => {
    if (!mergedNames.has(name) && projectJSONs[name]) {
      const cfg = projectJSONs[name];
      list.push({
        id:         name,
        name:       name,
        fullName:   name,
        displayName: cfg.displayName ?? formatName(name),
        desc:       cfg.shortDesc   ?? 'No description available.',
        fullDesc:   cfg.fullDesc    ?? 'No description available.',
        icon:       cfg.icon        ?? '📚',
        tags:       cfg.tags        ?? [],
        language:   cfg.language    ?? null,
        langColor:  langColors[cfg.language] ?? '#8b5cf6',
        liveUrl:    cfg.liveUrl     ?? null,
        docsUrl:    cfg.docsUrl     ?? null,
        links:      cfg.links       ?? null,
        githubUrl:  cfg.githubUrl   ?? null,
        subRepos:   cfg.subRepos    ?? [],
        subRepoOverviews: cfg.subRepoOverviews ?? {},
        stars:      0,
        forks:      0,
        archived:   false,
        status:     cfg.status      ?? 'Active',
        featured:   cfg.featured    ?? false,
        openIssues: 0,
        license:    null,
        updatedAt:  cfg.updatedAt ? new Date(cfg.updatedAt) : new Date(),
        createdAt:  cfg.createdAt ? new Date(cfg.createdAt) : new Date(),
      });
    }
  });

  return list;
}

/* ── Animate stat counters ── */
function updateStats(projects, totalRepos) {
  const langs      = new Set(projects.map(p => p.language).filter(Boolean));
  const liveCount  = projects.filter(p => p.liveUrl).length;
  const totalStars = projects.reduce((sum, p) => sum + p.stars, 0);

  animateCount('statTotal', totalRepos);
  animateCount('statLive',  liveCount);
  animateCount('statLangs', langs.size);
  animateCount('statStars', totalStars);
}

/* ── Generic JSON fetcher (throws on non-ok) ── */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}
