<script>
  import { getContext } from 'svelte';
  import { store } from '../lib/store.js';
  import { DAILY, todayKey, fmt, fmtSigned } from '../lib/utils.js';
  import ChartBarre from './ChartBarre.svelte';

  const openTagModal = getContext('openTagModal');

  let expName = '';
  let expAmount = '';
  let expDate = todayKey();
  let pendingTags = [];

  $: s = $store;
  $: today = todayKey();
  $: todayExpenses = s.expenses[today] || [];
  $: spent = parseFloat(todayExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2));
  $: budget = parseFloat((DAILY + s.carryover).toFixed(2));
  $: available = parseFloat((budget - spent).toFixed(2));
  $: pct = Math.min(100, budget > 0 ? (spent / budget) * 100 : 100);
  $: heroClass = available > 5 ? 'pos' : available < 0 ? 'neg' : 'warn';
  $: fillClass = pct >= 100 ? 'over' : pct > 75 ? 'warn' : '';
  $: isPastDate = expDate && expDate < today;

  function addExpense() {
    const name = expName.trim();
    const amount = parseFloat(String(expAmount).replace(',', '.'));
    if (!name || isNaN(amount) || amount <= 0) return;
    const dateKey = expDate || today;
    if (dateKey > today) return;
    store.addExpense(name, parseFloat(amount.toFixed(2)), dateKey, [...pendingTags]);
    expName = ''; expAmount = ''; expDate = today; pendingTags = [];
  }

  function toggleTag(id) {
    pendingTags = pendingTags.includes(id) ? pendingTags.filter(t => t !== id) : [...pendingTags, id];
  }


</script>

<!-- HERO -->
<div class="hero">
  <div class="hero-label">disponibile oggi</div>
  <div class="hero-amount {heroClass}">{available < 0 ? '-' : ''}{fmt(available)}</div>
  <div class="hero-sub">speso: <b>{fmt(spent)}</b> &nbsp;·&nbsp; limite: <b>€20,00</b></div>
  {#if s.carryover !== 0}
    <div class="carryover-badge {s.carryover > 0 ? 'pos' : 'neg'}">
      {s.carryover > 0 ? '+' : ''}{fmt(s.carryover)} da ieri
    </div>
  {/if}
</div>

<div class="progress-bar">
  <div class="progress-fill {fillClass}" style="width:{pct}%"></div>
</div>

<!-- FORM -->
<div class="section" style="margin-top:20px">
  <div class="section-label">aggiungi spesa</div>

  {#if available < 0}
    <div class="alert alert-danger">Hai sforato di {fmt(available)} · scalato domani</div>
  {:else if available < 3}
    <div class="alert alert-warn">Rimangono solo {fmt(available)} per oggi</div>
  {/if}

  <div class="input-row">
    <input class="input-field" type="text" bind:value={expName} placeholder="descrizione" autocomplete="off"
      on:keydown={e => e.key === 'Enter' && document.getElementById('exp-amount-field').focus()} />
    <input class="input-field" id="exp-amount-field" type="number" bind:value={expAmount} placeholder="€" step="0.01" min="0" style="max-width:90px"
      on:keydown={e => e.key === 'Enter' && addExpense()} />
    <button class="btn" on:click={addExpense}>+</button>
  </div>
  <div class="input-row" style="margin-bottom:4px">
<input class="input-field" type="date" bind:value={expDate} style="flex:1;font-size:13px;padding:7px 10px" />
    {#if isPastDate}<span class="date-badge">pregressa</span>{/if}
  </div>
  {#if s.tags.length > 0}
    <div class="tag-chip-row">
      {#each s.tags as t}
        <span class="tag-chip" class:active={pendingTags.includes(t.id)}
          style="background:{t.color}22;color:{t.color}" on:click={() => toggleTag(t.id)}>{t.name}</span>
      {/each}
    </div>
  {/if}
</div>

<!-- SPESE DI OGGI -->
<div class="section">
  <div class="section-label">spese di oggi</div>
  <div class="expenses-list">
    {#if todayExpenses.length === 0}
      <div class="empty">nessuna spesa registrata</div>
    {:else}
      {#each [...todayExpenses].reverse() as e, ri}
        {@const i = todayExpenses.length - 1 - ri}
        <div class="expense-item">
          <div class="expense-info">
            <div class="expense-name">{e.name}</div>
            {#if s.tags.length > 0 && e.tags?.length > 0}
              <div class="tag-pills-row">
                {#each e.tags as tid}
                  {@const tag = s.tags.find(t => t.id === tid)}
                  {#if tag}<span class="tag-pill" style="background:{tag.color}22;color:{tag.color}">{tag.name}</span>{/if}
                {/each}
              </div>
            {/if}
            <div class="expense-time">{e.time}</div>
          </div>
          <div class="expense-amount">-{fmt(e.amount)}</div>
          <button class="del-btn" on:click={() => store.delExpense(today, i)}>×</button>
        </div>
      {/each}
    {/if}
  </div>
</div>

<!-- CHART 7 GIORNI -->
<div class="section">
  <div class="section-label">ultimi 7 giorni</div>
  <div class="chart-legend">
    <span><span class="leg-sq leg-ok"></span>entro limite</span>
    <span><span class="leg-sq leg-over"></span>sforato</span>
    <span><span class="leg-sq leg-warn"></span>limite ok, carryover negativo</span>
    <span><span class="leg-line leg-neutral"></span>limite €20</span>
  </div>
  <ChartBarre />
</div>

<!-- SALDO -->
<div class="section" style="margin-top:20px">
  <div class="section-label">saldo carta</div>
  <div class="saldo-row">
    <div class="saldo-display">{s.saldo !== null ? fmt(s.saldo) : '—'}</div>
  </div>
</div>


<div style="height:20px"></div>
