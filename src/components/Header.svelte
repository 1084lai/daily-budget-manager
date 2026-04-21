<script>
  import { syncStatus } from '../lib/store.js';

  $: dateStr = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const syncSymbol = { saving: '⟳', ok: '✓', error: '✕', idle: '' };
</script>

<div class="header">
  <span class="header-title">Budget</span>
  <div class="header-right">
    {#if $syncStatus !== 'idle'}
      <span class="sync-badge {$syncStatus}">{syncSymbol[$syncStatus]}</span>
    {/if}
    <span class="header-date">{dateStr}</span>
  </div>
</div>
