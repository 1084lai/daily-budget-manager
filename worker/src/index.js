/**
 * Budget App — Cloudflare Worker
 * Endpoints:
 *   GET  /api/load           → legge budget_v2 da KV
 *   POST /api/save           → scrive budget_v2 su KV
 *   GET  /api/backup/list    → lista snapshot di backup
 *   GET  /api/backup/:key    → scarica uno snapshot
 *
 * Autenticazione: delegata a Cloudflare Access (il Worker
 * riceve solo richieste già autenticate da CF Access).
 * In sviluppo locale (wrangler dev) Access non è attivo,
 * quindi tutte le richieste passano liberamente.
 */

const KV_KEY    = 'budget_v2';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard limit KV

// ── CORS helpers ──────────────────────────────────────────────────────────────
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function text(msg, status = 200, origin) {
  return new Response(msg, {
    status,
    headers: { 'Content-Type': 'text/plain', ...corsHeaders(origin) },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const method = request.method.toUpperCase();
    const origin = request.headers.get('Origin');

    // Preflight CORS
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── GET /api/load ─────────────────────────────────────────────────────────
    if (url.pathname === '/api/load' && method === 'GET') {
      const raw = await env.BUDGET_KV.get(KV_KEY);
      if (!raw) return json({}, 200, origin);
      return new Response(raw, {
        status:  200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    // ── POST /api/save ────────────────────────────────────────────────────────
    if (url.pathname === '/api/save' && method === 'POST') {
      const body = await request.text();

      // Validazione dimensione
      if (body.length > MAX_BYTES) {
        return text('Payload troppo grande', 413, origin);
      }

      // Validazione JSON
      try { JSON.parse(body); }
      catch { return text('JSON non valido', 400, origin); }

      await env.BUDGET_KV.put(KV_KEY, body);
      return text('ok', 200, origin);
    }

    // ── GET /api/backup/list ──────────────────────────────────────────────────
    if (url.pathname === '/api/backup/list' && method === 'GET') {
      const list = await env.BUDGET_KV.list({ prefix: 'budget_backup_' });
      const keys = list.keys.map(k => ({
        key:     k.name,
        date:    k.name.replace('budget_backup_', ''),
        expires: k.expiration
          ? new Date(k.expiration * 1000).toISOString()
          : null,
      }));
      return json(keys, 200, origin);
    }

    // ── GET /api/backup/:date ─────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/backup/') && method === 'GET') {
      const date = url.pathname.replace('/api/backup/', '');
      const key  = `budget_backup_${date}`;
      const raw  = await env.BUDGET_KV.get(key);
      if (!raw) return text('Backup non trovato', 404, origin);
      return new Response(raw, {
        status:  200,
        headers: {
          'Content-Type':        'application/json',
          'Content-Disposition': `attachment; filename="budget_backup_${date}.json"`,
          ...corsHeaders(origin),
        },
      });
    }

    return text('Not found', 404, origin);
  },

  // ── Cron: backup notturno (attivare in wrangler.toml) ─────────────────────
  async scheduled(event, env) {
    const raw = await env.BUDGET_KV.get(KV_KEY);
    if (!raw) return;
    const date = new Date().toISOString().slice(0, 10);
    const key  = `budget_backup_${date}`;
    // TTL 90 giorni
    await env.BUDGET_KV.put(key, raw, { expirationTtl: 60 * 60 * 24 * 90 });
    console.log(`Backup creato: ${key}`);
  },
};
