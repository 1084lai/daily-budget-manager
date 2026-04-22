const enc = new TextEncoder();

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(str) {
  return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

async function signJWT(payload, secret) {
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid token');
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error('invalid signature');
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('expired');
  return payload;
}

function workerDefaultState() {
  return { expenses: {}, history: [], recurring: [], tags: [], extras: [], saldo: null, lastDate: null, carryover: 0 };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    async function getUser(req) {
      const auth = req.headers.get('Authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (!token) return null;
      try { return await verifyJWT(token, env.JWT_SECRET); }
      catch { return null; }
    }

    if (url.pathname === '/api/register') return json({ error: 'registrazione disabilitata' }, 403);

    // ── Login ─────────────────────────────────────────────────────────────────
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const { email, password } = await req.json();
      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
      if (!user) return json({ error: 'credenziali non valide' }, 401);
      const hash = await hashPassword(password, user.salt);
      if (hash !== user.hash) return json({ error: 'credenziali non valide' }, 401);
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJWT({ user_id: user.id, exp }, env.JWT_SECRET);
      return json({ token });
    }

    // ── Load ──────────────────────────────────────────────────────────────────
    if (url.pathname === '/api/load' && req.method === 'GET') {
      const user = await getUser(req);
      if (!user) return json({ error: 'non autorizzato' }, 401);
      const row = await env.DB.prepare('SELECT data FROM state WHERE user_id = ?').bind(user.user_id).first();
      return json(row ? JSON.parse(row.data) : {});
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    if (url.pathname === '/api/save' && req.method === 'POST') {
      const user = await getUser(req);
      if (!user) return json({ error: 'non autorizzato' }, 401);
      const data = await req.text();
      await env.DB.prepare(
        'INSERT INTO state (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
      ).bind(user.user_id, data, Date.now()).run();
      return json({ ok: true });
    }

    // ── Add expense (usato da iOS Shortcut) ───────────────────────────────────
    if (url.pathname === '/api/expense' && req.method === 'POST') {
      const user = await getUser(req);
      if (!user) return json({ error: 'non autorizzato' }, 401);
      let body;
      try { body = await req.json(); } catch { return json({ error: 'json non valido' }, 400); }
      const { name, amount } = body;
      if (!name || typeof amount !== 'number' || amount <= 0) return json({ error: 'name e amount (number > 0) richiesti' }, 400);

      const row = await env.DB.prepare('SELECT data FROM state WHERE user_id = ?').bind(user.user_id).first();
      const state = row ? Object.assign(workerDefaultState(), JSON.parse(row.data)) : workerDefaultState();

      const today = new Date().toISOString().split('T')[0];
      if (!state.expenses[today]) state.expenses[today] = [];
      const expense = { name, amount: parseFloat(amount.toFixed(2)), time: new Date().toISOString().slice(11, 16), tags: [] };
      state.expenses[today].push(expense);
      if (!state.lastDate) state.lastDate = today;

      await env.DB.prepare(
        'INSERT INTO state (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
      ).bind(user.user_id, JSON.stringify(state), Date.now()).run();
      return json({ ok: true, expense });
    }

    return json({ error: 'not found' }, 404);
  },
};
