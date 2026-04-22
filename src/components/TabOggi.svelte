<script>
  import { getContext } from 'svelte';
  import { store } from '../lib/store.js';
  import { DAILY, todayKey, fmt, fmtSigned } from '../lib/utils.js';
  import ExpenseForm from './ExpenseForm.svelte';

  const openTagModal = getContext('openTagModal');

  $: s = $store;
  $: today = todayKey();
  $: todayExpenses = s.expenses[today] || [];
  $: spent = parseFloat(todayExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2));
  $: budget = parseFloat((DAILY + s.carryover).toFixed(2));
  $: available = parseFloat((budget - spent).toFixed(2));
  $: pct = Math.min(100, budget > 0 ? (spent / budget) * 100 : 100);
  $: heroClass = available > 5 ? 'pos' : available < 0 ? 'neg' : 'warn';
  $: fillClass = pct >= 100 ? 'over' : pct > 75 ? 'warn' : '';

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

  <ExpenseForm tags={s.tags} maxDate={today}
    on:add={e => store.addExpense(e.detail.name, e.detail.amount, e.detail.date, e.detail.tags)} />
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


<div style="height:20px"></div>
