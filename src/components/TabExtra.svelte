<script>
  import { getContext } from 'svelte';
  import { store } from '../lib/store.js';
  import { fmt, todayKey } from '../lib/utils.js';

  const openTagModal = getContext('openTagModal');

  $: s = $store;

  // Recurring
  let recName = '';
  let recAmount = '';
  let recDay = '';

  function addRecurring() {
    const name = recName.trim();
    const amount = parseFloat(String(recAmount).replace(',', '.'));
    if (!name || isNaN(amount) || amount <= 0) return;
    const dayVal = parseInt(recDay, 10);
    const day = (!isNaN(dayVal) && dayVal >= 1 && dayVal <= 31) ? dayVal : null;
    store.addRecurring(name, parseFloat(amount.toFixed(2)), day);
    recName = ''; recAmount = ''; recDay = '';
  }

  $: recTotal = s.recurring.reduce((sum, r) => sum + r.amount, 0);

  // Extras
  let extraName = '';
  let extraAmount = '';
  let extraDate = todayKey();
  let pendingExtraTags = [];

  function addExtra() {
    const name = extraName.trim();
    const amount = parseFloat(String(extraAmount).replace(',', '.'));
    if (!name || isNaN(amount) || amount <= 0) return;
    store.addExtra(name, parseFloat(amount.toFixed(2)), extraDate || todayKey(), [...pendingExtraTags]);
    extraName = ''; extraAmount = ''; extraDate = todayKey(); pendingExtraTags = [];
  }

  function toggleExtraTag(id) {
    pendingExtraTags = pendingExtraTags.includes(id)
      ? pendingExtraTags.filter(t => t !== id)
      : [...pendingExtraTags, id];
  }

  $: extraTotal = s.extras.reduce((sum, e) => sum + e.amount, 0);
</script>

<!-- RICORRENTI -->
<div class="section" style="padding-top:24px">
  <div class="section-label">abbonamenti e ricorrenti</div>
  <div class="input-row">
    <input class="input-field" type="text" bind:value={recName} placeholder="nome (es. Netflix)" autocomplete="off"
      on:keydown={e => e.key === 'Enter' && addRecurring()} />
    <input class="input-field" type="number" bind:value={recAmount} placeholder="€/mese" step="0.01" min="0" style="max-width:90px" />
    <input class="input-field" type="number" bind:value={recDay} placeholder="gg" min="1" max="31" style="max-width:58px" />
    <button class="btn" on:click={addRecurring}>+</button>
  </div>
  {#if s.recurring.length === 0}
    <div class="empty">nessun abbonamento</div>
  {:else}
    {#each s.recurring as r, i}
      <div class="recurring-item">
        <div>
          <div class="recurring-name">{r.name}</div>
          <div class="recurring-detail">{r.day ? `ogni mese il giorno ${r.day}` : 'ricorrente mensile'}</div>
        </div>
        <div class="recurring-right">
          <span class="recurring-amount">{fmt(r.amount)}/mese</span>
          <button class="del-btn" on:click={() => store.delRecurring(i)}>×</button>
        </div>
      </div>
    {/each}
  {/if}
</div>

<div class="section" style="margin-top:20px">
  <div class="cards-grid cards-2">
    <div class="metric-card"><div class="metric-label">totale mensile</div><div class="metric-value">{fmt(recTotal)}</div></div>
    <div class="metric-card"><div class="metric-label">totale annuale</div><div class="metric-value">{fmt(recTotal * 12)}</div></div>
  </div>
</div>

<!-- STRAORDINARIE -->
<div class="section" style="margin-top:20px">
  <div class="section-label">spese straordinarie</div>
  <div class="input-row">
    <input class="input-field" type="text" bind:value={extraName} placeholder="descrizione" autocomplete="off"
      on:keydown={e => e.key === 'Enter' && addExtra()} />
    <input class="input-field" type="number" bind:value={extraAmount} placeholder="€" step="0.01" min="0" style="max-width:90px" />
    <button class="btn" on:click={addExtra}>+</button>
  </div>
  <div class="input-row" style="margin-bottom:4px">
    <span style="font-size:12px;color:var(--text3);align-self:center;flex-shrink:0;min-width:32px">data</span>
    <input class="input-field" type="date" bind:value={extraDate} style="flex:1;font-size:13px;padding:7px 10px" />
  </div>
  {#if s.tags.length > 0}
    <div class="tag-chip-row">
      {#each s.tags as t}
        <span class="tag-chip" class:active={pendingExtraTags.includes(t.id)}
          style="background:{t.color}22;color:{t.color}" on:click={() => toggleExtraTag(t.id)}>{t.name}</span>
      {/each}
    </div>
  {/if}
  {#if s.extras.length === 0}
    <div class="empty">nessuna spesa straordinaria</div>
  {:else}
    {#each [...s.extras].reverse() as e, ri}
      {@const i = s.extras.length - 1 - ri}
      <div class="expense-item">
        <div class="expense-info">
          <div class="expense-name">{e.name}</div>
          {#if e.tags?.length > 0}
            <div class="tag-pills-row">
              {#each e.tags as tid}
                {@const tag = s.tags.find(t => t.id === tid)}
                {#if tag}<span class="tag-pill" style="background:{tag.color}22;color:{tag.color}">{tag.name}</span>{/if}
              {/each}
            </div>
          {/if}
          <div class="expense-time">{e.date}{e.time ? ' ' + e.time : ''}</div>
        </div>
        <div class="expense-amount">-{fmt(e.amount)}</div>
        {#if s.tags.length > 0}
          <button class="tag-btn" on:click={() => openTagModal({ type: 'extra', idx: i })}>tag</button>
        {/if}
        <button class="del-btn" style="margin-left:6px" on:click={() => store.delExtra(i)}>×</button>
      </div>
    {/each}
  {/if}
</div>

<div class="section" style="margin-top:20px">
  <div class="metric-card" style="display:flex;justify-content:space-between;align-items:center">
    <div class="metric-label">totale straordinarie</div>
    <div class="metric-value neg">{fmt(extraTotal)}</div>
  </div>
</div>
<div style="height:20px"></div>
