# daily-budget-manager

Budget giornaliero personale. Limite fisso €20/giorno con sistema di carryover.

## Stack

- **Una sola fonte**: `public/index.html` (~1200 righe) — HTML + CSS + JS tutto inline
- **Runtime**: Cloudflare Workers (solo static assets), deploy via Wrangler
- **Charts**: Chart.js 4.4.1 (CDN)
- **Nessun framework**, nessun bundler, nessuna dipendenza runtime

## Comandi

```bash
npm start          # dev locale (wrangler dev)
npm run deploy     # deploy su Cloudflare
```

## Struttura dello stato

```js
state = {
  expenses:  { "2026-04-20": [{ name, amount, time, tags: [tagId] }] },
  history:   [{ date, spent, carryover, remaining }],  // ultimi 60 giorni
  recurring: [{ name, amount }],
  tags:      [{ id, name, color }],
  saldo:     null | number,
  lastDate:  "2026-04-20",
  carryover: 0
}
```

## Logica chiave

**Day rollover** (`checkDayRollover`): se `lastDate !== today`, archivia il giorno precedente in `history`, calcola `remaining = DAILY + carryover - spent`, aggiorna `carryover`. Gira all'init.

**Persistenza**: doppio livello — `localStorage` (immediato, offline-safe) + `/api/load` `/api/save` (Cloudflare Workers KV). Il fetch remoto ha try/catch: se fallisce, usa localStorage. **Attualmente non c'è un worker script nel repo** (`wrangler.jsonc` ha solo `assets`), quindi le API falliscono silenziosamente e tutto gira su localStorage.

**Carryover badge colori** (barchart 7 giorni):
- verde: `remaining >= 0` e carryover ok
- rosso: `spent > budget` (sforato)
- arancio: entro limite ma carryover negativo

## Tab e sezioni

| Tab | ID | Contenuto |
|-----|----|-----------|
| Oggi | `tab-oggi` | hero amount, form spesa, grafico 7gg, saldo carta |
| Storico | `tab-storico` | grafico carryover linea, metriche, gestione tag, storico giornaliero |
| Ricorrenti | `tab-ricorrenti` | abbonamenti mensili con totale mensile/annuale |

## Render

`render()` = entry point principale, ridisegna tutto il tab oggi. Chiamata dopo ogni modifica allo stato.

Funzioni specializzate: `renderChartBarre()`, `renderChartLinea()`, `renderHistory()`, `renderRecurring()`, `renderTagChipRowAdd()`, `renderScheduled()` (se presente).

I chart vanno distrutti e ricreati al cambio tema (`chartBarre.destroy()`).

## Tag

- Creati nello storico tab (nome + colore da palette)
- Assegnati via modal (`openTagModal(date, expIdx)`) — `expIdx === null` = applica a tutte le spese del giorno
- `_pendingTags[]` = tag selezionati nel form prima di aggiungere la spesa

## Convenzioni

- Date come chiave stringa ISO: `"2026-04-20"` (da `todayKey()`)
- Importi sempre `parseFloat(...toFixed(2))`
- Formattazione: `fmt(n)` → `"€12,50"`, `fmtSigned(n)` → `"+€5,00"`
- Tema auto: scuro dalle 20:00 alle 07:00, override manuale in `localStorage['theme_pref']`
- `DAILY = 20` — unica costante per il limite giornaliero

## Attenzione

- Modificare `checkDayRollover` con cautela: tocca `carryover` e `history`, errori silenti rovinano lo storico
- I chart Chart.js vanno sempre distrutti prima di ricrearli (variabili globali `chartBarre`, `chartLinea`)
- `state.expenses[today]` è garantito esistere dopo `checkDayRollover()`, per le altre date verificare prima
