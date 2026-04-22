<script>
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { store } from '../lib/store.js';
  import { fmt } from '../lib/utils.js';

  let canvas;
  let chart = null;
  let slices = [];
  let hasData = false;

  function bgColor() {
    const pref = localStorage.getItem('theme_pref');
    const hour = new Date().getHours();
    const dark = pref ? pref === 'dark' : (hour >= 20 || hour < 7);
    return dark ? '#1c1c1a' : '#f5f5f0';
  }

  function buildSlices(s) {
    const tagMap = {};
    for (const tag of s.tags) tagMap[tag.id] = { name: tag.name, color: tag.color, total: 0 };
    let untagged = 0;

    for (const exps of Object.values(s.expenses)) {
      for (const e of exps) {
        if (e.tags?.length > 0) {
          for (const tid of e.tags) { if (tagMap[tid]) tagMap[tid].total += e.amount; }
        } else {
          untagged += e.amount;
        }
      }
    }

    const entries = Object.values(tagMap).filter(t => t.total > 0);
    if (untagged > 0) entries.push({ name: 'senza tag', color: '#888780', total: untagged });
    return entries;
  }

  function render(s) {
    const entries = buildSlices(s);
    hasData = entries.length > 0;

    if (!hasData) {
      if (chart) { chart.destroy(); chart = null; }
      return;
    }

    const total = entries.reduce((sum, e) => sum + e.total, 0);
    const labels  = entries.map(e => e.name);
    const data    = entries.map(e => parseFloat(e.total.toFixed(2)));
    const colors  = entries.map(e => e.color);
    const offsets = data.map(v => (v / total) < 0.08 ? 12 : 0);

    slices = entries.map(e => ({
      name: e.name, color: e.color,
      total: e.total,
      pct: Math.round((e.total / total) * 100),
    }));

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].backgroundColor = colors;
      chart.data.datasets[0].offset = offsets;
      chart.data.datasets[0].borderColor = bgColor();
      chart.update('none');
      return;
    }

    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data, backgroundColor: colors,
          borderColor: bgColor(), borderWidth: 3,
          hoverOffset: 14, offset: offsets,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        animation: { animateRotate: true, duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${fmt(ctx.raw)}  ${Math.round(ctx.raw / total * 100)}%`,
            },
          },
        },
      },
    });
  }

  onMount(() => store.subscribe(s => { if (canvas) render(s); }));
  onDestroy(() => { if (chart) { chart.destroy(); chart = null; } });
</script>

<div class="chart-container" style="height:200px; display:{hasData ? 'block' : 'none'}">
  <canvas bind:this={canvas}></canvas>
</div>

{#if hasData}
  <div class="torta-legend">
    {#each slices.sort((a, b) => b.total - a.total) as sl}
      <div class="torta-leg-row">
        <span class="torta-leg-dot" style="background:{sl.color}"></span>
        <span class="torta-leg-name">{sl.name}</span>
        <span class="torta-leg-spacer"></span>
        <span class="torta-leg-val">{fmt(sl.total)}</span>
        <span class="torta-leg-pct" style="color:{sl.color}">{sl.pct}%</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="empty">nessuna spesa con tag assegnato</div>
{/if}

<style>
  .torta-legend {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .torta-leg-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .torta-leg-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .torta-leg-name {
    color: var(--text1);
    flex-shrink: 0;
  }
  .torta-leg-spacer {
    flex: 1;
    border-bottom: 1px dotted var(--text3);
    opacity: 0.4;
    margin: 0 4px 2px;
  }
  .torta-leg-val {
    color: var(--text2);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .torta-leg-pct {
    font-size: 11px;
    font-weight: 600;
    min-width: 32px;
    text-align: right;
    flex-shrink: 0;
  }
</style>
