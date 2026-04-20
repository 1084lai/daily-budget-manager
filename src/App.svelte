<script>
  import { onMount, setContext } from 'svelte';
  import { store } from './lib/store.js';
  import Header from './components/Header.svelte';
  import Nav from './components/Nav.svelte';
  import TagModal from './components/TagModal.svelte';
  import TabOggi from './components/TabOggi.svelte';
  import TabStorico from './components/TabStorico.svelte';
  import TabExtra from './components/TabExtra.svelte';

  const THEME_KEY = 'theme_pref';

  let activeTab = 'oggi';
  let theme = 'light';
  let loading = true;

  // Tag modal state
  let modalOpen = false;
  let modalTitle = '';
  let modalInitTags = [];
  let modalCtx = null;

  function applyTheme() {
    const pref = localStorage.getItem(THEME_KEY);
    const h = new Date().getHours();
    const autoDark = h >= 20 || h < 7;
    theme = pref !== null ? pref : (autoDark ? 'dark' : 'light');
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.content = theme === 'dark' ? '#0f0f0e' : '#ffffff';
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, theme);
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.content = theme === 'dark' ? '#0f0f0e' : '#ffffff';
  }

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
    applyTheme();
    await store.init();
    loading = false;
    setInterval(applyTheme, 60000);
  });
</script>

<div class="app" data-theme={theme}>
  {#if loading}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-label">caricamento…</div>
    </div>
  {/if}

  <Header {theme} onToggleTheme={toggleTheme} />

  {#if activeTab === 'oggi'}
    <TabOggi {theme} />
  {:else if activeTab === 'storico'}
    <TabStorico {theme} />
  {:else if activeTab === 'extra'}
    <TabExtra />
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
