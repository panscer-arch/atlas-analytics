import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createOfficePresenceHandler, OFFICE_PATH } from '../server/office-presence.mjs';

let time=100000;
const handler=createOfficePresenceHandler({
  authorize:async req=>req.headers.cookie==='session=a'?'a':req.headers.cookie==='session=b'?'b':null,
  getMemberIds:async()=>new Set(['member-a','member-b']),
  now:()=>time,
});
const server=http.createServer(async(req,res)=>{
  if(!await handler(req,res,new URL(req.url,'http://localhost'))){res.statusCode=404;res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const endpoint=`http://127.0.0.1:${server.address().port}${OFFICE_PATH}`;
async function call(body,cookie='session=a',origin='https://supersussystem.com') {
  const r=await fetch(endpoint,{method:body?'POST':'GET',headers:{cookie,origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
}
try {
  assert.equal((await call(null,'')).status,401);
  assert.equal((await call({action:'join',memberId:'member-a'},'')).status,401);
  assert.equal((await call(null,'session=a','https://untrusted.invalid')).status,403);
  assert.equal((await call({action:'join',memberId:'missing'})).status,400);
  const joined=await call({action:'join',memberId:'member-a'});
  assert.equal(joined.status,200);const token=joined.data.token;
  assert.equal(joined.data.people[0].token,undefined);
  assert.equal(joined.data.people[0].owner,undefined);
  assert.equal((await call({action:'join',memberId:'member-a'})).status,409);
  assert.equal((await call({action:'leave',token},'session=b')).status,401);
  assert.equal((await call({action:'update',token,x:'bad',z:0,status:'focus',task:''})).status,400);
  assert.equal((await call({action:'update',token,x:0,z:0,status:'invented',task:''})).status,400);
  assert.equal((await call({action:'update',token,x:0,z:0,status:'focus',task:'a'.repeat(141)})).status,400);
  const update=await call({action:'update',token,x:999,z:-999,status:'focus',task:'Test task'});
  assert.equal(update.status,200);
  const replica=(await call(null,'session=b')).data.people[0];
  assert.equal(replica.x,14.5);assert.equal(replica.z,-10.5);assert.equal(replica.status,'focus');assert.equal(replica.task,'Test task');
  assert.equal((await call({action:'leave',token})).status,200);
  assert.equal((await call()).data.people.length,0);
  const expiring=await call({action:'join',memberId:'member-b'});
  time+=90001;
  assert.equal((await call()).data.people.length,0);
  assert.equal((await call({action:'leave',token:expiring.data.token})).status,401);
  let limited=false;
  for(let i=0;i<245;i++)if((await call()).status===429){limited=true;break;}
  assert.ok(limited,'rate limit must activate');
  console.log('Office presence: access, origins, roster validation, ownership, bounds, synchronization, expiry and rate limit passed.');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
