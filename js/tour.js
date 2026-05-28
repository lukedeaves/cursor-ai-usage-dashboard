const TOUR_KEY = 'cursor-usage-tour-done';

const STEPS = [
  { target: '#kpi-grid', title: 'KPI overview', text: 'Your totals at a glance. Click a card to switch the chart metric. Deltas compare to the previous period.' },
  { target: '#filter-bar', title: 'Filters', text: 'Use presets, date range, and multi-select filters. Save views for quick recall.' },
  { target: '#insights-section', title: 'Insights', text: 'Spend forecast, anomaly detection, and model efficiency help you spot trends.' },
  { target: '#compare-section', title: 'Compare periods', text: 'Pick two date ranges to compare cost, requests, and tokens side by side.' },
  { target: '#cost-chart-wrap', title: 'Time series', text: 'Track usage over time. Set a budget line when viewing cost.' },
  { target: '#export-btn', title: 'Export', text: 'Export filtered CSV or print a PDF summary report anytime.' },
];

export function initTour() {
  if (localStorage.getItem(TOUR_KEY)) return;
  // Auto-start after first data load is handled in app.js
}

export function startTour(force = false) {
  if (!force && localStorage.getItem(TOUR_KEY)) return;

  const overlay = document.getElementById('tour-overlay');
  if (!overlay) return;

  let step = 0;
  overlay.classList.add('open');

  function showStep() {
    const s = STEPS[step];
    const el = document.querySelector(s.target);
    document.getElementById('tour-title').textContent = s.title;
    document.getElementById('tour-text').textContent = s.text;
    document.getElementById('tour-step').textContent = `${step + 1} / ${STEPS.length}`;

    document.querySelectorAll('.tour-highlight').forEach(n => n.classList.remove('tour-highlight'));
    if (el) {
      el.classList.add('tour-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  document.getElementById('tour-next').onclick = () => {
    step++;
    if (step >= STEPS.length) endTour();
    else showStep();
  };

  document.getElementById('tour-skip').onclick = endTour;
  overlay.querySelector('.tour-backdrop')?.addEventListener('click', endTour);

  function endTour() {
    overlay.classList.remove('open');
    document.querySelectorAll('.tour-highlight').forEach(n => n.classList.remove('tour-highlight'));
    localStorage.setItem(TOUR_KEY, '1');
  }

  showStep();
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
