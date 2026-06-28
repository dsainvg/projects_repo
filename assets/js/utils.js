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
export function clamp(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
