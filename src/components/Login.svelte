<script>
  import { createEventDispatcher } from 'svelte';
  import { store } from '../lib/store.js';

  const dispatch = createEventDispatcher();

  let mode = 'login';
  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function submit() {
    if (!email.trim() || !password) { error = 'compila tutti i campi'; return; }
    loading = true; error = '';
    try {
      if (mode === 'login') await store.login(email.trim(), password);
      else await store.register(email.trim(), password);
      dispatch('authed');
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-wrap">
  <div class="login-card">
    <div class="login-title">budget</div>
    <input class="input-field" type="email" bind:value={email} placeholder="email" autocomplete="email"
      on:keydown={e => e.key === 'Enter' && document.getElementById('login-pwd').focus()} />
    <input class="input-field" id="login-pwd" type="password" bind:value={password} placeholder="password"
      on:keydown={e => e.key === 'Enter' && submit()} style="margin-top:8px" />

    {#if error}
      <div class="login-error">{error}</div>
    {/if}

    <button class="btn login-btn" on:click={submit} disabled={loading}>
      {loading ? '...' : (mode === 'login' ? 'accedi' : 'registrati')}
    </button>
  </div>
</div>

<style>
  .login-wrap {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }
  .login-card {
    background: var(--card);
    border-radius: 16px;
    padding: 32px 24px;
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .login-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 20px;
    text-align: center;
    letter-spacing: -0.5px;
  }
  .login-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    background: var(--bg);
    border-radius: 8px;
    padding: 4px;
  }
  .login-tab {
    flex: 1;
    padding: 7px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 13px;
    color: var(--text3);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .login-tab.active {
    background: var(--card);
    color: var(--text);
    font-weight: 600;
  }
  .login-error {
    font-size: 12px;
    color: var(--red);
    margin-top: 8px;
    text-align: center;
  }
  .login-btn {
    margin-top: 16px;
    width: 100%;
    padding: 12px;
    font-size: 14px;
  }
</style>
