<script>
  export let activeTab;
  export let onSwitch;
</script>

<nav class="nav">
  <button class="nav-item" class:active={activeTab === 'oggi'} on:click={() => onSwitch('oggi')}>
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
    oggi
  </button>
  <button class="nav-item" class:active={activeTab === 'storico'} on:click={() => onSwitch('storico')}>
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
    storico
  </button>
  <button class="nav-item" class:active={activeTab === 'extra'} on:click={() => onSwitch('extra')}>
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 12v-2a8 8 0 0116 0v2"/><path d="M20 12v2a8 8 0 01-16 0v-2"/>
    </svg>
    extra
  </button>
  <button class="nav-item" class:active={activeTab === 'grafici'} on:click={() => onSwitch('grafici')}>
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <polyline points="22 20 14 12 8 18 2 12"/><polyline points="22 12 14 4 8 10 2 4"/>
    </svg>
    grafici
  </button>
  <button class="nav-item" class:active={activeTab === 'utils'} on:click={() => onSwitch('utils')}>
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-3 3z"/>
      <path d="M5 20l7.4-7.4M2 17l5-5 3 3-5 5-3-3z"/>
    </svg>
    utils
  </button>
</nav>
