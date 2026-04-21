# Contesto sessione — daily-budget-manager

## Repo
- GitHub: https://github.com/1084lai/daily-budget-manager
- Branch attivo: `migration-to-svelte`
- Branch feature auth: `feat/multi-user-auth`

## Stack
- Svelte 4 + Vite 4
- Cloudflare Pages (static assets)
- Deploy: `npm run deploy` (wrangler)
- Entry: `src/App.svelte`, stili globali in `src/app.css`

## Componenti attuali
| File | Ruolo |
|------|-------|
| `App.svelte` | Root, routing tab, context openTagModal |
| `Header.svelte` | Intestazione con data |
| `Nav.svelte` | 4 tab: oggi / storico / extra / utils |
| `TabOggi.svelte` | Hero, form spesa, lista oggi, chart 7gg |
| `TabStorico.svelte` | Chart carryover, riepilogo, storico giornaliero |
| `TabExtra.svelte` | Abbonamenti ricorrenti + spese straordinarie |
| `TabUtils.svelte` | Tag manager + export/import JSON |
| `ExpenseForm.svelte` | Form condiviso per aggiunta spesa (usato in TabOggi e TabExtra) |
| `ChartBarre.svelte` | Bar chart 7 giorni (Chart.js) |
| `ChartLinea.svelte` | Line chart carryover (Chart.js) |
| `TagModal.svelte` | Modal assegnazione tag |

## Stato `store.js`
- Persistenza: localStorage (`budget_v2`) + `/api/load` `/api/save` (fallisce silenziosamente, nessun worker attivo)
- `syncStatus` writable: mostra stato sync (attualmente rimosso dall'Header)
- Stato: `expenses`, `history`, `recurring`, `tags`, `extras`, `saldo`, `lastDate`, `carryover`

## Cosa è stato fatto in questa sessione
1. Creata tab **utils** con tag manager + export/import (spostati da TabStorico e TabOggi)
2. Fix **bug critico**: `expAmount.replace()` su tipo number → wrappato con `String()` in TabOggi e TabExtra
3. Rimosso **tema dark** completamente (CSS, chart, Header, tutti i componenti)
4. Rimossa **X** nell'header (era il badge syncStatus in errore)
5. Rimossa label "data" nel form inserimento spesa
6. Saldo carta: funzione aggiornamento spostata in utils (poi rimossa del tutto)
7. Estratto componente condiviso **ExpenseForm.svelte**

## Branch `feat/multi-user-auth` — STASH LOCALE (non pushato)
Lo stash `stash@{0}` su `migration-to-svelte` contiene l'intera implementazione multi-utente.
**ATTENZIONE**: lo stash è solo locale. Per recuperarlo su un'altra macchina fare prima `git stash pop` e poi committare.

### Cosa contiene lo stash
- `src/worker.js` — Worker CF con auth custom (PBKDF2 + JWT Web Crypto nativo)
- `src/components/Login.svelte` — form login/registrazione
- `schema.sql` — schema D1 (tabelle `users` e `state`)
- `src/lib/store.js` — aggiornato con `login()`, `register()`, `logout()`, `authed` store, migrazione localStorage→D1
- `src/lib/utils.js` — aggiunte costanti `TOKEN_KEY`, `MIGRATED_KEY`, `API_LOGIN`, `API_REGISTER`
- `wrangler.jsonc` — aggiunto `main: src/worker.js`, binding D1 (manca `database_id` reale)
- `src/App.svelte` — gate auth (`{#if !$authed}<Login />{:else}...{/if}`)
- `src/app.css` — aggiunto `.logout-btn`
- `src/components/Header.svelte` — prop `onLogout` opzionale

### Per attivare l'auth (comandi wrangler da eseguire)
```bash
git checkout feat/multi-user-auth
git stash pop
wrangler d1 create budget-db       # copia il database_id nel wrangler.jsonc
wrangler d1 execute budget-db --file schema.sql
wrangler secret put JWT_SECRET     # scegli stringa random lunga
npm run deploy
```

### Logica migrazione dati esistenti
Al primo login con D1 vuoto: se `localStorage['budget_migrated']` non esiste e `localStorage['budget_v2']` ha dati → li migra su D1 automaticamente e setta il flag.

## Prossimi passi suggeriti
- Pushare o committare lo stash su `feat/multi-user-auth` prima di cambiare macchina
- Completare il deploy dell'auth (vedi comandi sopra)
- Eventuale integrazione API reale per retrieve saldo carta (hook già predisposto con gear button rimosso — da reintrodurre)
