<script>
  $: dateStr = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
</script>

<div class="header">
  <span class="header-title">Budget</span>
  <div class="header-right">
    <span class="header-date">{dateStr}</span>
  </div>
</div>
