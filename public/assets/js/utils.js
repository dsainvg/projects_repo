/**
 * utils.js — Pure helper functions (no DOM, no state)
 */

/**
 * Human-readable relative time from a Date object.
 * @param {Date} date
 * @returns {string}
 */
export function timeAgo(date) {
  const secs = Math.floor((Date.now() - date) / 1000);
  if (secs < 60)       return 'just now';
  if (secs < 3600)     return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400)    return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800)   return `${Math.floor(secs / 86400)}d ago`;
  if (secs < 2592000)  return `${Math.floor(secs / 604800)}w ago`;
  if (secs < 31536000) return `${Math.floor(secs / 2592000)}mo ago`;
  return `${Math.floor(secs / 31536000)}y ago`;
}

/**
 * Convert repo snake_case / kebab-case names to readable title.
 * @param {string} name
 * @returns {string}
 */
export function formatName(name) {
  return name.replace(/[-_]/g, ' ');
}

/**
 * Animate a counter element from 0 to target.
 * @param {string} id  Element ID
 * @param {number} target
 */
export function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  if (target === 0) { el.textContent = '0'; return; }

  let current = 0;
  const step = Math.ceil(target / 28);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 32);
}

/**
 * Return a default emoji icon for a language.
 * @param {string|null} lang
 * @returns {string}
 */
export function langIcon(lang) {
  const MAP = {
    Python: '🐍', JavaScript: '🌐', TypeScript: '🔷',
    'C++': '⚙️', Go: '🚀', HTML: '🎨', CSS: '💅',
    Rust: '🦀', Java: '☕', Shell: '💻',
  };
  return MAP[lang] || '📦';
}

/**
 * Clamp a string to maxLen characters.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
/**
 * Clamp a string to maxLen characters.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function clamp(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Handle accordion toggling for sub-repositories.
 * Fetches details from GitHub API dynamically on first click.
 * @param {HTMLElement} btn
 */
export async function toggleSubRepoElement(btn) {
  const container = btn.closest('.subrepo-item');
  if (!container) return;
  
  const body = container.querySelector('.subrepo-body');
  if (!body) return;
  
  const repoName = btn.dataset.repo;
  const isOpen = container.classList.toggle('open');
  
  if (isOpen) {
    body.classList.remove('collapsed');
    body.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 'px';
    
    if (body.dataset.loaded !== 'true') {
      body.innerHTML = `<div class="subrepo-loading">Loading repository details...</div>`;
      body.style.maxHeight = body.scrollHeight + 'px';
      
      try {
        const res = await fetch(`https://api.github.com/repos/dsainvg/${repoName}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        
        const desc = data.description || 'No description available.';
        const stars = data.stargazers_count;
        const forks = data.forks_count;
        const lang = data.language || '';
        
        const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const langBadge = lang 
          ? `<span class="subrepo-stat"><span class="subrepo-dot">●</span> ${lang}</span>`
          : '';
        
        body.innerHTML = `
          <p class="subrepo-desc">${esc(desc)}</p>
          <div class="subrepo-meta">
            ${langBadge}
            <span class="subrepo-stat">★ ${stars} stars</span>
            <span class="subrepo-stat">⌥ ${forks} forks</span>
            <a href="${data.html_url}" target="_blank" rel="noopener noreferrer" class="subrepo-git-link">
              Source Code →
            </a>
          </div>
        `;
        body.dataset.loaded = 'true';
        body.style.maxHeight = body.scrollHeight + 'px';
      } catch (err) {
        body.innerHTML = `
          <p class="subrepo-desc-error">Could not load description automatically.</p>
          <div class="subrepo-meta">
            <a href="https://github.com/dsainvg/${repoName}" target="_blank" rel="noopener noreferrer" class="subrepo-git-link">
              View on GitHub →
            </a>
          </div>
        `;
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    }
  } else {
    body.style.maxHeight = '0px';
    setTimeout(() => {
      if (!container.classList.contains('open')) {
        body.classList.remove('open');
        body.classList.add('collapsed');
      }
    }, 250);
  }
}
