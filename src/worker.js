function b64decode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

async function isAuthenticated(req, env) {
  // Local dev: nessun CF_TEAM_DOMAIN → accetta tutto
  if (!env.CF_TEAM_DOMAIN) return true;

  const token = req.headers.get('CF-Access-Jwt-Assertion');
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const header  = JSON.parse(b64decode(parts[0]));
    const payload = JSON.parse(b64decode(parts[1]));

    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    if (env.CF_AUD && ![].concat(payload.aud).includes(env.CF_AUD)) return false;

    const certsRes = await fetch(`https://${env.CF_TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`);
    const { keys } = await certsRes.json();
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) return false;

    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig  = Uint8Array.from(b64decode(parts[2]), c => c.charCodeAt(0));
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, data);
  } catch { return false; }
}

function workerDefaultState() {
  return { expenses: {}, history: [], recurring: [], tags: [], extras: [], saldo: null, lastDate: null, carryover: 0 };
}

const STATE_KEY = 'main';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Client-Secret',
    };

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const authed = await isAuthenticated(req, env);
    if (!authed) return json({ error: 'non autorizzato' }, 401);

    // ── Load ──────────────────────────────────────────────────────────────────
    if (url.pathname === '/api/load' && req.method === 'GET') {
      const row = await env.DB.prepare('SELECT data FROM state WHERE id = ?').bind(STATE_KEY).first();
      return json(row ? JSON.parse(row.data) : {});
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    if (url.pathname === '/api/save' && req.method === 'POST') {
      const data = await req.text();
      await env.DB.prepare(
        'INSERT INTO state (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
      ).bind(STATE_KEY, data, Date.now()).run();
      return json({ ok: true });
    }

    // ── Add expense (iOS Shortcut) ────────────────────────────────────────────
    if (url.pathname === '/api/expense' && req.method === 'POST') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'json non valido' }, 400); }
      const { name, amount } = body;
      if (!name || typeof amount !== 'number' || amount <= 0) return json({ error: 'name e amount (number > 0) richiesti' }, 400);

      const row = await env.DB.prepare('SELECT data FROM state WHERE id = ?').bind(STATE_KEY).first();
      const state = row ? Object.assign(workerDefaultState(), JSON.parse(row.data)) : workerDefaultState();

      const today = new Date().toISOString().split('T')[0];
      if (!state.expenses[today]) state.expenses[today] = [];
      const expense = { name, amount: parseFloat(amount.toFixed(2)), time: new Date().toISOString().slice(11, 16), tags: [] };
      state.expenses[today].push(expense);
      if (!state.lastDate) state.lastDate = today;

      await env.DB.prepare(
        'INSERT INTO state (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
      ).bind(STATE_KEY, JSON.stringify(state), Date.now()).run();
      return json({ ok: true, expense });
    }

    return json({ error: 'not found' }, 404);
  },
};
