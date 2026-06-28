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
    // 1. Load settings + GitHub repos in parallel
    const [settings, repos] = await Promise.all([
      fetchJSON(SETTINGS_URL),
      fetchJSON(GITHUB_API),
    ]);

    const { excludedRepos = [], langColors = {} } = settings;

    // 2. Try to load a JSON file for every repo (fire in parallel, ignore 404s)
    const projectJSONs = await loadProjectFiles(repos, excludedRepos);

    // 3. Merge API data with project JSON overrides
    const projects = mergeProjects(repos, projectJSONs, langColors, excludedRepos);

    state.allProjects      = projects;
    state.filteredProjects = [...projects];
    state.loaded           = true;

    updateStats(projects, langColors);
    onSuccess(projects);

  } catch (err) {
    console.error('[api.js] Fatal error:', err);
    onError(err);
  }
}

/* ── Load all project JSON files in parallel ── */
async function loadProjectFiles(repos, excludedRepos) {
  const results = await Promise.allSettled(
    repos
      .filter(r => !excludedRepos.includes(r.name))
      .map(async r => {
        const data = await fetchJSON(`${PROJECT_BASE}${r.name}/project.json`).catch(() => null);
        return { repoName: r.name, data };
      })
  );

  // Build a map: repoName → project JSON (or null if file doesn't exist)
  const map = {};
  results.forEach(r => {
    if (r.status === 'fulfilled' && r.value) {
      map[r.value.repoName] = r.value.data;
    }
  });
  return map;
}

/* ── Merge GitHub API repo + project JSON override ── */
function mergeProjects(repos, projectJSONs, langColors, excludedRepos) {
  return repos
    .map(repo => {
      const cfg = projectJSONs[repo.name] ?? {};

      return {
        id:         repo.id,
        name:       repo.name,
        fullName:   repo.full_name,
        displayName: cfg.displayName ?? formatName(repo.name),
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
    })
    .filter(p => !excludedRepos.includes(p.name));
}

/* ── Animate stat counters ── */
function updateStats(projects) {
  const langs      = new Set(projects.map(p => p.language).filter(Boolean));
  const liveCount  = projects.filter(p => p.liveUrl).length;
  const totalStars = projects.reduce((sum, p) => sum + p.stars, 0);

  animateCount('statTotal', projects.length);
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
