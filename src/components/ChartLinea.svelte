<script>
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { store } from '../lib/store.js';

  let canvas;
  let chart = null;

  const lineColor = '#185FA5';
  const textColor = '#9b9b97';
  const gridColor = 'rgba(0,0,0,0.05)';

  function render(s) {
    if (s.history.length < 2) {
      if (chart) { chart.destroy(); chart = null; }
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9b9b97';
      ctx.font = '13px -apple-system, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('dati disponibili dopo 2+ giorni', canvas.width / 2, canvas.height / 2);
      return;
    }

    const days = s.history.slice().reverse().slice(-14);
    const labels = days.map(d => new Date(d.date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }));
    const data = days.map(d => parseFloat(d.remaining.toFixed(2)));
    const pointColors = data.map(v => v >= 0 ? lineColor : '#a32d2d');

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].pointBackgroundColor = pointColors;
      chart.update('none');
      return;
    }

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data, borderColor: lineColor, borderWidth: 2, pointBackgroundColor: pointColors, pointRadius: 3, pointHoverRadius: 5, tension: 0.3, fill: false }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => (ctx.raw >= 0 ? ' +€' : ' -€') + Math.abs(ctx.raw).toFixed(2) } },
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, grid: { color: gridColor }, border: { display: false } },
          y: { ticks: { color: textColor, font: { size: 10 }, callback: v => (v >= 0 ? '+' : '') + '€' + v }, grid: { color: gridColor }, border: { display: false } },
        },
      },
    });
  }

  onMount(() => store.subscribe(s => { if (canvas) render(s); }));
  onDestroy(() => { if (chart) { chart.destroy(); chart = null; } });
</script>

<div class="chart-container" style="height:160px">
  <canvas bind:this={canvas}></canvas>
</div>
