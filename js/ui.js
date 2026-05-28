let toastContainer = null;

export function initToasts() {
  toastContainer = document.getElementById('toast-container');
}

export function showToast(message, type = 'info', duration = 5000) {
  if (!toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `<span>${message}</span><button type="button" class="toast-close" aria-label="Dismiss">×</button>`;
  el.querySelector('.toast-close').addEventListener('click', () => el.remove());
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export function animateValue(el, endValue, formatter, duration = 600) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (el) el.textContent = formatter(endValue);
    return;
  }
  const start = parseFloat(el.dataset.rawValue || '0') || 0;
  const end = typeof endValue === 'number' ? endValue : 0;
  el.dataset.rawValue = String(end);
  const startTime = performance.now();

  function frame(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = start + (end - start) * eased;
    el.textContent = formatter(current);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

let onThemeChange = null;
export function setThemeChangeCallback(fn) { onThemeChange = fn; }

const ICONS = {
  sun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};

export function initTheme() {
  const saved = localStorage.getItem('cursor-usage-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  setTheme(theme, false);
}

export function setTheme(theme, persist = true) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const isDark = theme === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.innerHTML = isDark ? ICONS.sun : ICONS.moon;
    btn.title = isDark ? 'Light mode' : 'Dark mode';
  }
  if (persist) localStorage.setItem('cursor-usage-theme', theme);
  if (onThemeChange) onThemeChange(theme);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(current === 'light' ? 'dark' : 'light');
}

export function cssVar(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function updateFreshnessLabel() {
  const el = document.getElementById('freshness-label');
  if (!el) return;
  const ts = localStorage.getItem('cursor-usage-last-import');
  if (!ts) { el.style.display = 'none'; return; }
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  let label;
  if (mins < 1) label = 'Imported just now';
  else if (mins < 60) label = `Imported ${mins}m ago`;
  else if (hours < 24) label = `Imported ${hours}h ago`;
  else label = `Imported ${days}d ago`;
  el.textContent = label;
  el.style.display = 'inline';
}

export function renderSparkline(canvas, values, color) {
  if (!canvas || !values.length) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth * (devicePixelRatio || 1);
  const h = canvas.height = canvas.offsetHeight * (devicePixelRatio || 1);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h * 0.8) - h * 0.1;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * (devicePixelRatio || 1);
  ctx.stroke();

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = color.startsWith('#') ? color + '33' : 'rgba(124,106,247,0.2)';
  ctx.fill();
}

export function glassTooltipPlugin() {
  return {
    id: 'glassTooltip',
    beforeDraw(chart) {
      const tooltip = chart.tooltip;
      if (!tooltip || !tooltip.opacity) return;
    },
  };
}

export function staggerDashboard(show) {
  const dash = document.getElementById('dashboard');
  if (!dash) return;
  dash.querySelectorAll('.animate-in').forEach((el, i) => {
    el.style.animationDelay = show ? `${i * 0.08}s` : '0s';
    el.classList.toggle('shown', show);
  });
}
