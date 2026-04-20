<script>
  import { createEventDispatcher } from 'svelte';
  export let title = '';
  export let tags = [];
  export let initTags = [];

  const dispatch = createEventDispatcher();
  let selected = [...initTags];

  function toggle(id) {
    selected = selected.includes(id) ? selected.filter(t => t !== id) : [...selected, id];
  }

  function confirm() { dispatch('confirm', selected); }
  function cancel() { dispatch('cancel'); }

  function onOverlayClick(e) {
    if (e.target === e.currentTarget) cancel();
  }
</script>

<div class="modal-overlay" on:click={onOverlayClick}>
  <div class="modal-sheet">
    <div class="modal-title">{title}</div>
    <div class="modal-chips">
      {#each tags as t}
        <span
          class="tag-chip"
          class:active={selected.includes(t.id)}
          style="background:{t.color}22;color:{t.color}"
          on:click={() => toggle(t.id)}
        >{t.name}</span>
      {/each}
    </div>
    <div class="modal-actions">
      <button class="btn" style="background:var(--bg2);color:var(--text)" on:click={cancel}>annulla</button>
      <button class="btn" on:click={confirm}>applica</button>
    </div>
  </div>
</div>
