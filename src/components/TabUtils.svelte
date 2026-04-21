<script>
  import { store } from '../lib/store.js';
  import { TAG_PALETTE } from '../lib/utils.js';
  import { API_LOAD, KV_KEY } from '../lib/utils.js';

  import { fmt } from '../lib/utils.js';

  $: s = $store;

  function editSaldo() {
    const v = prompt('Inserisci il saldo attuale della tua Postepay (€):');
    if (v === null) return;
    const n = parseFloat(String(v).replace(',', '.'));
    if (!isNaN(n) && n >= 0) store.updateSaldo(parseFloat(n.toFixed(2)));
  }

  // Tag
  let tagName = '';
  let selectedColor = TAG_PALETTE[0];

  function addTag() {
    if (!tagName.trim()) return;
    store.addTag(tagName.trim(), selectedColor);
    tagName = '';
  }

  // Export / Import
  async function exportData() {
    let payload;
    try { const res = await fetch(API_LOAD); payload = await res.text(); }
    catch { payload = localStorage.getItem(KV_KEY) || '{}'; }
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `budget_${new Date().toISOString().slice(0,10)}.json` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  let importInput;
  function importData() { importInput.click(); }
  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (typeof parsed !== 'object' || !parsed.expenses) throw new Error('struttura non riconosciuta');
      store.importState(parsed);
      alert('Importazione completata.');
    } catch (err) { alert('Errore importazione: ' + err.message); }
    e.target.value = '';
  }
</script>

<!-- SALDO -->
<div class="section" style="padding-top:24px">
  <div class="section-label">saldo carta</div>
  <div class="saldo-row">
    <div class="saldo-display">{s.saldo !== null ? fmt(s.saldo) : '—'}</div>
    <button class="btn-sm" on:click={editSaldo}>aggiorna</button>
  </div>
</div>

<!-- TAG MANAGER -->
<div class="section" style="padding-top:24px">
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

<!-- DATI -->
<div class="section" style="margin-top:20px">
  <div class="section-label">dati</div>
  <div class="data-actions">
    <button class="btn-data" on:click={exportData}>⬇ esporta JSON</button>
    <button class="btn-data" on:click={importData}>⬆ importa JSON</button>
  </div>
  <input type="file" bind:this={importInput} accept=".json,application/json" style="display:none" on:change={handleImport} />
</div>

<div style="height:20px"></div>
