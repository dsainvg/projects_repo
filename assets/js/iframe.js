/**
 * iframe.js — Fullscreen preview modal controller
 *
 * Opens a modal popup with a browser-chrome iframe when
 * "Preview Site" is clicked. Closes on backdrop click,
 * close button, or Escape key.
 */

import { state } from './state.js';

const modal  = () => document.getElementById('previewModal');
const frame  = () => document.getElementById('liveFrame');
const bar    = () => document.getElementById('chromeBar');

/* ── Open the modal and load a URL ── */
export function loadIframe(url) {
  if (!url) return;
  state.iframeUrl = url;

  const f = frame();
  const b = bar();

  // Reset frame first to avoid flash of old content
  f.classList.remove('loaded');
  f.src = 'about:blank';

  // Update chrome bar
  b.textContent = url;
  b.classList.add('active');

  // Show modal (CSS transition handles animation)
  modal().classList.add('open');
  modal().setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';  // prevent scroll behind modal

  // Load the actual URL
  requestAnimationFrame(() => {
    f.src = url;
    f.onload = () => f.classList.add('loaded');
  });
}

/* ── Close the modal ── */
export function closeModal() {
  state.iframeUrl = null;

  const f = frame();
  const b = bar();

  modal().classList.remove('open');
  modal().setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  // Small delay so the close animation plays before clearing the iframe
  setTimeout(() => {
    f.src = 'about:blank';
    f.classList.remove('loaded');
    b.textContent = 'about:blank';
    b.classList.remove('active');
  }, 300);
}

/* ── Reload current URL ── */
export function reloadIframe() {
  if (state.iframeUrl) {
    const f = frame();
    f.classList.remove('loaded');
    f.src = state.iframeUrl;
    f.onload = () => f.classList.add('loaded');
  }
}

/* ── Open current URL in a new tab ── */
export function openIframeInNewTab() {
  if (state.iframeUrl) {
    window.open(state.iframeUrl, '_blank', 'noopener,noreferrer');
  }
}

/* ── Bind all modal controls ── */
export function bindIframeControls() {
  // Close button inside chrome bar
  document.getElementById('previewClose')?.addEventListener('click', closeModal);

  // Backdrop click to close
  document.getElementById('previewBackdrop')?.addEventListener('click', closeModal);

  // Reload button
  document.getElementById('iframeReload')?.addEventListener('click', reloadIframe);

  // Open in new tab button
  document.getElementById('iframeNewTab')?.addEventListener('click', openIframeInNewTab);

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal().classList.contains('open')) {
      closeModal();
    }
  });
}

// Legacy alias used by panel.js onclick handlers
export const resetIframe = closeModal;
