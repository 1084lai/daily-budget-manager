<script>
  import { getContext } from 'svelte';
  import { store } from '../lib/store.js';
  import { fmt, fmtSigned, dateLabel, TAG_PALETTE } from '../lib/utils.js';
  import ChartLinea from './ChartLinea.svelte';

  export let theme;
  const openTagModal = getContext('openTagModal');

  $: s = $store;
  $: avg = s.history.length > 0 ? s.history.reduce((sum, h) => sum + h.spent, 0) / s.history.length : 0;
  $: daysOk = s.history.filter(h => h.remaining >= 0).length;

  let expanded = {};
  function toggleExpand(date) { expanded = { ...expanded, [date]: !expanded[date] }; }

  // Tags
  let tagName = '';
  let selectedColor = TAG_PALETTE[0];

  function addTag() {
    if (!tagName.trim()) return;
    store.addTag(tagName.trim(), selectedColor);
    tagName = '';
  }

  function realSpent(date) {
    return parseFloat((s.expenses[date] || []).reduce((sum, e) => sum + e.amount, 0).toFixed(2));
  }
</script>

<!-- CHART CARRYOVER -->
<div class="section" style="padding-top:24px">
  <div class="section-label">andamento carryover</div>
  <div class="chart-legend">
    <span><span class="leg-line leg-blue"></span>carryover cumulato</span>
    <span style="margin-left:4px;font-size:11px;color:var(--text3)">sopra lo zero = in risparmio</span>
  </div>
  {#key theme}
    <ChartLinea {theme} />
  {/key}
</div>

<!-- STATS -->
<div class="section" style="margin-top:20px">
  <div class="section-label">riepilogo</div>
  <div class="cards-grid cards-3">
    <div class="metric-card"><div class="metric-label">media/giorno</div><div class="metric-value">{fmt(avg)}</div></div>
    <div class="metric-card"><div class="metric-label">giorni ok</div><div class="metric-value pos">{daysOk}/{s.history.length}</div></div>
    <div class="metric-card">
      <div class="metric-label">carryover</div>
      <div class="metric-value {s.carryover >= 0 ? 'pos' : 'neg'}">{(s.carryover >= 0 ? '+' : '-')}{fmt(s.carryover)}</div>
    </div>
  </div>
</div>

<!-- TAG MANAGER -->
<div class="section" style="margin-top:20px">
  <div class="section-label">tag</div>
  <div class="input-row" style="align-items:center">
    <input class="input-field" type="text" bind:value={tagName} placeholder="nome tag" autocomplete="off"
      on:keydown={e => e.key === 'Enter' && addTag()} />
    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
      {#each TAG_PALETTE as c}
        <span class="color-swatch" class:active={selectedColor === c} style="background:{c}"
          on:click={() => selectedColor = c}></span>
      {/each}
    </div>
    <button class="btn" on:click={addTag}>+</button>
  </div>
  {#if s.tags.length === 0}
    <div class="empty" style="padding:12px 0">nessun tag creato</div>
  {:else}
    {#each s.tags as t}
      <div class="tag-manage-item">
        <span class="tag-color-dot" style="background:{t.color}"></span>
        <span style="flex:1;font-size:14px;color:var(--text)">{t.name}</span>
        <button class="del-btn" on:click={() => store.delTag(t.id)}>×</button>
      </div>
    {/each}
  {/if}
</div>

<!-- STORICO -->
<div class="section" style="margin-top:20px">
  <div class="section-label">storico giornaliero</div>
  {#if s.history.length === 0}
    <div class="empty">nessuno storico disponibile</div>
  {:else}
    {#each s.history as h}
      {@const isPos = h.remaining >= 0}
      {@const dayExps = s.expenses[h.date] || []}
      <div class="history-item">
        <div class="history-date">{dateLabel(h.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div class="history-row" on:click={() => toggleExpand(h.date)}>
          <span class="history-spent">speso {fmt(realSpent(h.date))}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="history-carry" style="color:var(--{isPos ? 'green' : 'red'})">{fmtSigned(h.remaining)}</span>
            {#if s.tags.length > 0}
              <button class="tag-btn" on:click|stopPropagation={() => openTagModal({ type: 'history', date: h.date, expIdx: null })}>tag tutto</button>
            {/if}
          </div>
        </div>
        <span class="history-day-toggle" on:click={() => toggleExpand(h.date)}>
          {expanded[h.date] ? 'nascondi spese' : 'mostra spese'}
        </span>
        {#if expanded[h.date]}
          <div class="history-exp-list">
            {#if dayExps.length === 0}
              <div style="font-size:12px;color:var(--text3);padding:6px 0">nessuna spesa registrata</div>
            {:else}
              {#each dayExps as e, expIdx}
                <div class="history-exp-item">
                  <div class="history-exp-row">
                    <span class="history-exp-name">{e.name}</span>
                    <span class="history-exp-amount">-{fmt(e.amount)}</span>
                    {#if s.tags.length > 0}
                      <button class="tag-btn" on:click={() => openTagModal({ type: 'history', date: h.date, expIdx })}>tag</button>
                    {/if}
                    <button class="del-btn" style="margin-left:4px;flex-shrink:0" on:click={() => store.delExpense(h.date, expIdx)}>×</button>
                  </div>
                  {#if e.tags?.length > 0}
                    <div class="tag-pills-row">
                      {#each e.tags as tid}
                        {@const tag = s.tags.find(t => t.id === tid)}
                        {#if tag}<span class="tag-pill" style="background:{tag.color}22;color:{tag.color}">{tag.name}</span>{/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
<div style="height:20px"></div>
