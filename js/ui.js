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

export function initTheme() {
  const saved = localStorage.getItem('cursor-usage-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  setTheme(theme, false);
}

export function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  if (persist) localStorage.setItem('cursor-usage-theme', theme);
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  setTheme(next);
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
