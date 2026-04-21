<script>
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { store } from '../lib/store.js';
  import { DAILY, todayKey, fmt } from '../lib/utils.js';

  let canvas;
  let chart = null;

  function buildDays(s) {
    const today = todayKey();
    const todaySpent = parseFloat((s.expenses[today] || []).reduce((sum, e) => sum + e.amount, 0).toFixed(2));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (key === today) {
        days.push({ date: key, spent: todaySpent, remaining: parseFloat((DAILY + s.carryover - todaySpent).toFixed(2)) });
      } else {
        const h = s.history.find(x => x.date === key);
        days.push(h || { date: key, spent: 0, remaining: DAILY });
      }
    }
    return days;
  }

  function barColor(d) {
    if (d.remaining >= 0) return '#2d7a4f';
    if (d.spent > DAILY)  return '#a32d2d';
    return '#b86e00';
  }

  function render(s) {
    const days = buildDays(s);
    const labels = days.map(d => new Date(d.date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }));
    const data = days.map(d => parseFloat(d.spent.toFixed(2)));
    const colors = days.map(barColor);
    const textColor = '#9b9b97';
    const gridColor = 'rgba(0,0,0,0.05)';

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].backgroundColor = colors;
      chart.data.datasets[1].data = Array(7).fill(DAILY);
      chart.update('none');
      return;
    }

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { data, backgroundColor: colors, borderRadius: 4, borderSkipped: false },
          { type: 'line', data: Array(7).fill(DAILY), borderColor: '#888780', borderDash: [4,3], fill: false, borderWidth: 1.5, pointRadius: 0, tension: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.datasetIndex === 0 ? ' €' + ctx.raw.toFixed(2) : ' limite €' + ctx.raw } },
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 }, maxRotation: 0, autoSkip: false }, grid: { color: gridColor }, border: { display: false } },
          y: { min: 0, ticks: { color: textColor, font: { size: 10 }, callback: v => '€' + v }, grid: { color: gridColor }, border: { display: false } },
        },
      },
    });
  }

  onMount(() => {
    const unsubscribe = store.subscribe(s => { if (canvas) render(s); });
    return unsubscribe;
  });

  onDestroy(() => { if (chart) { chart.destroy(); chart = null; } });
</script>

<div class="chart-container" style="height:160px">
  <canvas bind:this={canvas}></canvas>
</div>
