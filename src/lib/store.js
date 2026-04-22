import { writable } from 'svelte/store';
import { DAILY, KV_KEY, TOKEN_KEY, API_LOAD, API_SAVE, API_LOGIN, API_REGISTER, todayKey, nowTime } from './utils.js';

export const authToken = writable(localStorage.getItem(TOKEN_KEY) || null);
let _token = localStorage.getItem(TOKEN_KEY) || null;
authToken.subscribe(t => { _token = t; });

function authHeaders() {
  return _token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_token}` }
    : { 'Content-Type': 'application/json' };
}

// ── Sync status ───────────────────────────────────────────────────────────────
export const syncStatus = writable('idle');
let _syncTimer = null;
function setSyncStatus(s) {
  clearTimeout(_syncTimer);
  syncStatus.set(s);
  if (s === 'ok') _syncTimer = setTimeout(() => syncStatus.set('idle'), 2000);
}

// ── Default state ─────────────────────────────────────────────────────────────
function defaultState() {
  return { expenses: {}, history: [], recurring: [], tags: [], extras: [], saldo: null, lastDate: null, carryover: 0 };
}

// ── Pure helpers (take state, return new state) ───────────────────────────────
function fillHistoryGaps(s) {
  if (s.history.length === 0) return s;
  const asc = [...s.history].sort((a, b) => (a.date < b.date ? -1 : 1));
  const filled = [];
  let carryover = asc[0].carryover;
  let prev = null;
  for (let i = 0; i < asc.length; i++) {
    if (prev) {
      const cursor = new Date(prev.date + 'T12:00:00');
      cursor.setDate(cursor.getDate() + 1);
      const target = new Date(asc[i].date + 'T12:00:00');
      while (cursor < target) {
        const key = cursor.toISOString().split('T')[0];
        const spent = parseFloat((s.expenses[key] || []).reduce((sum, e) => sum + e.amount, 0).toFixed(2));
        const remaining = parseFloat((DAILY + carryover - spent).toFixed(2));
        filled.push({ date: key, spent, carryover, remaining });
        carryover = remaining;
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const spent = parseFloat((s.expenses[asc[i].date] || []).reduce((sum, e) => sum + e.amount, 0).toFixed(2));
    const remaining = parseFloat((DAILY + carryover - spent).toFixed(2));
    filled.push({ ...asc[i], spent, carryover, remaining });
    carryover = remaining;
    prev = asc[i];
  }
  filled.sort((a, b) => (a.date > b.date ? -1 : 1));
  if (filled.length > 60) filled.length = 60;
  return { ...s, history: filled, carryover };
}

function checkDayRollover(s) {
  const today = todayKey();
  let ns = { ...s, expenses: { ...s.expenses } };
  if (ns.lastDate && ns.lastDate !== today) {
    const cursor = new Date(ns.lastDate);
    const todayDate = new Date(today);
    const pending = [];
    let carryover = ns.carryover;
    while (cursor < todayDate) {
      const key = cursor.toISOString().split('T')[0];
      const spent = parseFloat((ns.expenses[key] || []).reduce((sum, e) => sum + e.amount, 0).toFixed(2));
      const remaining = parseFloat((DAILY + carryover - spent).toFixed(2));
      pending.push({ date: key, spent, carryover, remaining });
      carryover = remaining;
      cursor.setDate(cursor.getDate() + 1);
    }
    ns.history = [...pending.reverse(), ...ns.history];
    if (ns.history.length > 60) ns.history.length = 60;
    ns.carryover = carryover;
  }
  ns.lastDate = today;
  if (!ns.expenses[today]) ns.expenses[today] = [];
  return ns;
}

function rebuildFrom(s, dateKey) {
  const sorted = [...s.history].sort((a, b) => (a.date < b.date ? -1 : 1));
  const idx = sorted.findIndex(h => h.date === dateKey);
  if (idx === -1) return s;
  for (let i = idx; i < sorted.length; i++) {
    const h = { ...sorted[i] };
    h.spent = parseFloat((s.expenses[h.date] || []).reduce((sum, e) => sum + e.amount, 0).toFixed(2));
    h.remaining = parseFloat((DAILY + h.carryover - h.spent).toFixed(2));
    if (i + 1 < sorted.length) sorted[i + 1] = { ...sorted[i + 1], carryover: h.remaining };
    sorted[i] = h;
  }
  return { ...s, history: sorted.reverse(), carryover: sorted[0].remaining };
}

// ── Store ─────────────────────────────────────────────────────────────────────
function createStore() {
  const { subscribe, set, update } = writable(defaultState());

  function persist(s) {
    const payload = JSON.stringify(s);
    localStorage.setItem(KV_KEY, payload);
    setSyncStatus('saving');
    fetch(API_SAVE, { method: 'POST', headers: authHeaders(), body: payload })
      .then(r => (r.ok ? setSyncStatus('ok') : setSyncStatus('error')))
      .catch(() => setSyncStatus('error'));
    return s;
  }

  function mut(fn) {
    update(s => persist(fn(s)));
  }

  async function init() {
    let s = defaultState();
    try {
      const res = await fetch(API_LOAD, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const remote = await res.json();
      if (remote && Object.keys(remote).length > 0) {
        s = Object.assign(defaultState(), remote);
        if (!s.tags) s.tags = [];
        if (!s.extras) s.extras = [];
        localStorage.setItem(KV_KEY, JSON.stringify(s));
      }
    } catch {
      const cached = localStorage.getItem(KV_KEY);
      if (cached) try { s = Object.assign(defaultState(), JSON.parse(cached)); } catch {}
    }
    s = fillHistoryGaps(s);
    s = checkDayRollover(s);
    persist(s);
    set(s);
  }

  // Expenses
  function addExpense(name, amount, dateKey, tags) {
    mut(s => {
      const today = todayKey();
      const exps = [...(s.expenses[dateKey] || []), { name, amount, time: nowTime(), tags }];
      let ns = { ...s, expenses: { ...s.expenses, [dateKey]: exps } };
      if (dateKey < today) ns = rebuildFrom(ns, dateKey);
      return ns;
    });
  }

  function delExpense(dateKey, i) {
    mut(s => {
      const today = todayKey();
      const exps = (s.expenses[dateKey] || []).filter((_, idx) => idx !== i);
      let ns = { ...s, expenses: { ...s.expenses, [dateKey]: exps } };
      if (dateKey < today) ns = rebuildFrom(ns, dateKey);
      return ns;
    });
  }

  // Extras
  function addExtra(name, amount, dateKey, tags) {
    mut(s => ({ ...s, extras: [...s.extras, { name, amount, date: dateKey, time: nowTime(), tags }] }));
  }

  function delExtra(i) {
    mut(s => ({ ...s, extras: s.extras.filter((_, idx) => idx !== i) }));
  }

  // Recurring
  function addRecurring(name, amount, day) {
    mut(s => ({ ...s, recurring: [...s.recurring, { name, amount, day }] }));
  }

  function delRecurring(i) {
    mut(s => ({ ...s, recurring: s.recurring.filter((_, idx) => idx !== i) }));
  }

  // Tags
  function addTag(name, color) {
    const id = 't' + Date.now();
    mut(s => ({ ...s, tags: [...s.tags, { id, name, color }] }));
  }

  function delTag(id) {
    mut(s => {
      const expenses = Object.fromEntries(
        Object.entries(s.expenses).map(([k, v]) => [k, v.map(e => ({ ...e, tags: (e.tags || []).filter(t => t !== id) }))])
      );
      const extras = s.extras.map(e => ({ ...e, tags: (e.tags || []).filter(t => t !== id) }));
      return { ...s, tags: s.tags.filter(t => t.id !== id), expenses, extras };
    });
  }

  function assignTags(dateKey, expIdx, tagIds) {
    mut(s => {
      const exps = (s.expenses[dateKey] || []).map((e, i) => i === expIdx ? { ...e, tags: tagIds } : e);
      return { ...s, expenses: { ...s.expenses, [dateKey]: exps } };
    });
  }

  function assignTagsDay(dateKey, tagIds) {
    mut(s => {
      const exps = (s.expenses[dateKey] || []).map(e => ({ ...e, tags: tagIds }));
      return { ...s, expenses: { ...s.expenses, [dateKey]: exps } };
    });
  }

  function assignTagsExtra(idx, tagIds) {
    mut(s => ({ ...s, extras: s.extras.map((e, i) => i === idx ? { ...e, tags: tagIds } : e) }));
  }

  function updateSaldo(val) {
    mut(s => ({ ...s, saldo: val }));
  }

  function importState(data) {
    const ns = Object.assign(defaultState(), data);
    persist(ns);
    set(ns);
  }

  async function login(email, password) {
    const res = await fetch(API_LOGIN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'login fallito');
    localStorage.setItem(TOKEN_KEY, data.token);
    authToken.set(data.token);
  }

  async function register(email, password) {
    const res = await fetch(API_REGISTER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'registrazione fallita');
    localStorage.setItem(TOKEN_KEY, data.token);
    authToken.set(data.token);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(KV_KEY);
    authToken.set(null);
    set(defaultState());
  }

  return {
    subscribe,
    init,
    login, register, logout,
    addExpense, delExpense,
    addExtra, delExtra,
    addRecurring, delRecurring,
    addTag, delTag,
    assignTags, assignTagsDay, assignTagsExtra,
    updateSaldo,
    importState,
  };
}

export const store = createStore();
