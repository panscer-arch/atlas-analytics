import { randomBytes } from 'node:crypto';

export const OFFICE_PATH = '/api/content/office-presence';

// Ephemeral presence. No history, productivity scores or employee monitoring data.
export function createOfficePresenceHandler({ authorize, getMemberIds, now = Date.now }) {
  const sessions = new Map(), buckets = new Map();
  const ttl = 90000;
  function prune() {
    for (const [token, item] of sessions) if (now() - item.seen > ttl) sessions.delete(token);
    for (const [key, item] of buckets) if (now() - item.since > 60000) buckets.delete(key);
  }
  const people = () => [...sessions.values()].map(({ token, owner, ...p }) => p);
  return async (req, res, url) => {
    if (url.pathname !== OFFICE_PATH) return false;
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
      res.end(JSON.stringify(value)); return true;
    };
    if (req.headers.origin && !['https://supersussystem.com', 'https://www.supersussystem.com'].includes(req.headers.origin)) return send(403,{error:'origin_not_allowed'});
    const owner = await authorize(req);
    if (!owner) return send(401,{error:'Войдите в SuperSUS, чтобы открыть офис.'});
    prune();
    if (!buckets.has(owner)) {
      if (buckets.size >= 2000) return send(429,{error:'Попробуйте позже.'});
      buckets.set(owner,{since:now(),count:0});
    }
    if (++buckets.get(owner).count > 240) return send(429,{error:'Слишком много запросов. Подождите минуту.'});
    if (req.method === 'GET') return send(200,{people:people()});
    if (req.method !== 'POST') return send(405,{error:'method_not_allowed'});
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(415,{error:'json_required'});
    try {
      let text='';
      for await (const chunk of req) {text+=chunk;if(Buffer.byteLength(text)>2048)return send(413,{error:'body_too_large'});}
      const body=JSON.parse(text);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400,{error:'invalid_request'});
      if (body.action==='join') {
        if (typeof body.memberId!=='string'||body.memberId.length>100) return send(400,{error:'invalid_member'});
        const ids = await getMemberIds();
        if (!ids.has(body.memberId)) return send(400,{error:'Участник не найден в команде.'});
        // No await between checking occupancy and reserving a seat.
        if ([...sessions.values()].some(p=>p.memberId===body.memberId)) return send(409,{error:'Этот сотрудник уже в офисе.'});
        if (sessions.size>=64) return send(429,{error:'Офис заполнен.'});
        const token=randomBytes(24).toString('hex');
        sessions.set(token,{token,owner,memberId:body.memberId,x:0,z:9,status:'available',task:'',seen:now()});
        return send(200,{token,people:people()});
      }
      if (!['update','leave'].includes(body.action)) return send(400,{error:'invalid_action'});
      const item=sessions.get(body.token);
      if(!item||item.owner!==owner)return send(401,{error:'Сессия офиса завершена. Войдите снова.'});
      if(body.action==='leave'){sessions.delete(body.token);return send(200,{people:people()});}
      if(!Number.isFinite(body.x)||!Number.isFinite(body.z))return send(400,{error:'invalid_position'});
      if(!['available','focus','meeting','break'].includes(body.status))return send(400,{error:'invalid_status'});
      if(typeof body.task!=='string'||body.task.length>140)return send(400,{error:'invalid_task'});
      Object.assign(item,{x:Math.max(-12.5,Math.min(14.5,body.x)),z:Math.max(-10.5,Math.min(10.5,body.z)),status:body.status,task:body.task,seen:now()});
      return send(200,{people:people()});
    }catch{return send(400,{error:'invalid_request'});}
  };
}
