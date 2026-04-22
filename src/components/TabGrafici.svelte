<script>
  import ChartBarre from './ChartBarre.svelte';
  import ChartLinea from './ChartLinea.svelte';
  import ChartTorta from './ChartTorta.svelte';
</script>

<div class="section" style="padding-top:24px">
  <div class="section-label">ultimi 7 giorni</div>
  <div class="chart-legend">
    <span><span class="leg-sq leg-ok"></span>entro limite</span>
    <span><span class="leg-sq leg-over"></span>sforato</span>
    <span><span class="leg-sq leg-warn"></span>limite ok, carryover negativo</span>
    <span><span class="leg-line leg-neutral"></span>limite €20</span>
  </div>
  <ChartBarre />
</div>

<div class="section" style="margin-top:24px">
  <div class="section-label">andamento carryover</div>
  <div class="chart-legend">
    <span><span class="leg-line leg-blue"></span>carryover cumulato</span>
    <span style="margin-left:4px;font-size:11px;color:var(--text3)">sopra lo zero = in risparmio</span>
  </div>
  <ChartLinea />
</div>

<div class="section" style="margin-top:24px">
  <div class="section-label">spesa per tag</div>
  <ChartTorta />
</div>

<div style="height:20px"></div>
