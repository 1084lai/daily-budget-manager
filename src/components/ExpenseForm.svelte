<script>
  import { createEventDispatcher } from 'svelte';
  import { todayKey } from '../lib/utils.js';

  export let tags = [];
  export let maxDate = null;

  const dispatch = createEventDispatcher();

  let name = '';
  let amount = '';
  let date = todayKey();
  let pendingTags = [];
  let amountEl;

  $: today = todayKey();
  $: isPastDate = date && date < today;

  function toggleTag(id) {
    pendingTags = pendingTags.includes(id) ? pendingTags.filter(t => t !== id) : [...pendingTags, id];
  }

  function submit() {
    const n = name.trim();
    const a = parseFloat(String(amount).replace(',', '.'));
    if (!n || isNaN(a) || a <= 0) return;
    const dateKey = date || today;
    if (maxDate && dateKey > maxDate) return;
    dispatch('add', { name: n, amount: parseFloat(a.toFixed(2)), date: dateKey, tags: [...pendingTags] });
    name = ''; amount = ''; date = today; pendingTags = [];
  }
</script>

<div class="input-row">
  <input class="input-field" type="text" bind:value={name} placeholder="descrizione" autocomplete="off"
    on:keydown={e => e.key === 'Enter' && amountEl.focus()} />
  <input class="input-field" type="number" bind:value={amount} bind:this={amountEl} placeholder="€" step="0.01" min="0" style="max-width:90px"
    on:keydown={e => e.key === 'Enter' && submit()} />
  <button class="btn" on:click={submit}>+</button>
</div>
<div class="input-row" style="margin-bottom:4px">
  <input class="input-field" type="date" bind:value={date} max={maxDate || undefined} style="flex:1;font-size:13px;padding:7px 10px" />
  {#if isPastDate}<span class="date-badge">pregressa</span>{/if}
</div>
{#if tags.length > 0}
  <div class="tag-chip-row">
    {#each tags as t}
      <span class="tag-chip" class:active={pendingTags.includes(t.id)}
        style="background:{t.color}22;color:{t.color}" on:click={() => toggleTag(t.id)}>{t.name}</span>
    {/each}
  </div>
{/if}
