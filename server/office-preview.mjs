import { randomBytes } from 'node:crypto';

// Local preview only. This is deliberately not mounted in the production API.
export function officePreview() {
  const sessions = new Map();
  const publicView = () => {
    const now = Date.now();
    for (const [token, item] of sessions) if (now - item.seen > 20000) sessions.delete(token);
    return [...sessions.values()].map(({ token, ...item }) => item);
  };
  return {
    name: 'office-preview',
    async configureServer(server) {
      if (process.env.TEAM_OFFICE_PREVIEW === '1') {
        const response = await fetch('https://supersussystem.com/api/content/supersus.teamGraph.v3');
        if (!response.ok) throw new Error('Cannot load team preview snapshot');
        const snapshot = await response.json();
        server.middlewares.use('/api/content', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          if (req.method !== 'GET') { res.statusCode = 403; res.end(JSON.stringify({ ok: false, error: 'preview_read_only' })); return; }
          res.end(JSON.stringify(req.url === '/supersus.teamGraph.v3' ? snapshot : { ok: true, exists: false, value: null }));
        });
      }
      server.middlewares.use('/api/office', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
        // Browser requests must originate from this preview, including on localhost.
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'origin' });
        publicView();
        if (req.method === 'GET') return send(200, { people: publicView() });
        if (req.method !== 'POST') return send(405, { error: 'method' });
        let text = '';
        try {
          for await (const chunk of req) {
            text += chunk;
            if (text.length > 2048) return send(413, { error: 'size' });
          }
          const body = JSON.parse(text);
          if (body.action === 'join') {
            if (typeof body.memberId !== 'string' || body.memberId.length > 100) return send(400, { error: 'member' });
            if ([...sessions.values()].some(p => p.memberId === body.memberId)) return send(409, { error: 'Этот участник уже в офисе. Выберите другого.' });
            if (sessions.size >= 64) return send(429, { error: 'Офис заполнен' });
            const token = randomBytes(24).toString('hex');
            sessions.set(token, { token, memberId: body.memberId, x: 0, z: 9, status: 'available', task: '', seen: Date.now() });
            return send(200, { token, people: publicView() });
          }
          const item = sessions.get(body.token);
          if (!item) return send(401, { error: 'Сессия завершена. Войдите снова.' });
          if (body.action === 'leave') { sessions.delete(body.token); return send(200, { people: publicView() }); }
          if (Number.isFinite(body.x) && Number.isFinite(body.z)) {
            item.x = Math.max(-12, Math.min(12, body.x));
            item.z = Math.max(-10, Math.min(10, body.z));
          }
          if (['available', 'focus', 'meeting', 'break'].includes(body.status)) item.status = body.status;
          if (typeof body.task === 'string') item.task = body.task.slice(0, 140);
          item.seen = Date.now();
          return send(200, { people: publicView() });
        } catch { send(400, { error: 'request' }); }
      });
    },
  };
}
