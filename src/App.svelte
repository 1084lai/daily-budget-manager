<script>
  import { onMount, setContext } from 'svelte';
  import { store } from './lib/store.js';
  import Header from './components/Header.svelte';
  import Nav from './components/Nav.svelte';
  import TagModal from './components/TagModal.svelte';
  import TabOggi from './components/TabOggi.svelte';
  import TabStorico from './components/TabStorico.svelte';
  import TabExtra from './components/TabExtra.svelte';
  import TabUtils from './components/TabUtils.svelte';

  let activeTab = 'oggi';
  let loading = true;

  let modalOpen = false;
  let modalTitle = '';
  let modalInitTags = [];
  let modalCtx = null;

  function openTagModal(ctx) {
    const s = $store;
    modalCtx = ctx;
    if (ctx.type === 'history') {
      if (ctx.expIdx === null) {
        const exps = s.expenses[ctx.date] || [];
        modalInitTags = exps.length > 0
          ? s.tags.filter(t => exps.every(e => (e.tags || []).includes(t.id))).map(t => t.id)
          : [];
        modalTitle = 'tag per tutte le voci del giorno';
      } else {
        const exp = (s.expenses[ctx.date] || [])[ctx.expIdx];
        modalInitTags = exp ? [...(exp.tags || [])] : [];
        modalTitle = 'tag per questa voce';
      }
    } else if (ctx.type === 'extra') {
      const extra = s.extras[ctx.idx];
      modalInitTags = extra ? [...(extra.tags || [])] : [];
      modalTitle = 'tag per questa voce';
    }
    modalOpen = true;
  }

  setContext('openTagModal', openTagModal);

  function onModalConfirm(e) {
    const tagIds = e.detail;
    if (modalCtx.type === 'history') {
      if (modalCtx.expIdx === null) store.assignTagsDay(modalCtx.date, tagIds);
      else store.assignTags(modalCtx.date, modalCtx.expIdx, tagIds);
    } else if (modalCtx.type === 'extra') {
      store.assignTagsExtra(modalCtx.idx, tagIds);
    }
    modalOpen = false;
  }

  onMount(async () => {
    await store.init();
    loading = false;
  });
</script>

<div class="app">
  {#if loading}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-label">caricamento…</div>
    </div>
  {/if}

  <Header />

  {#if activeTab === 'oggi'}
    <TabOggi />
  {:else if activeTab === 'storico'}
    <TabStorico />
  {:else if activeTab === 'extra'}
    <TabExtra />
  {:else if activeTab === 'utils'}
    <TabUtils />
  {/if}

  <Nav {activeTab} onSwitch={tab => activeTab = tab} />

  {#if modalOpen}
    <TagModal
      title={modalTitle}
      tags={$store.tags}
      initTags={modalInitTags}
      on:confirm={onModalConfirm}
      on:cancel={() => modalOpen = false}
    />
  {/if}
</div>
