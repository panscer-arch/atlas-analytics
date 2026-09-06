import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(os.tmpdir(),'departments-access-'));
const port=21000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server/content-api.mjs'],{cwd:process.cwd(),env:{...process.env,ATLAS_CONTENT_API_PORT:String(port),ATLAS_CONTENT_STORE_DIR:dir,TELEGRAM_BOT_TOKEN:''},stdio:'ignore'});
try{
 let ready=false;for(let i=0;i<50;i++){try{if((await fetch(base+'/api/content/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'API started');
 const endpoint=base+'/api/content/supersus.departments.v1';
 assert.equal((await fetch(endpoint)).status,401,'Departments read must require existing SuperSUS session');
 assert.equal((await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:{version:1}})})).status,401,'Anonymous write blocked');
 await writeFile(path.join(dir,'atlas.analytics.marketingBrowserLinkRequest.v1.json'),JSON.stringify({code:'department-test-only',expiresAt:new Date(Date.now()+60000).toISOString()}));
 const login=await fetch(base+'/api/marketing/browser-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:'department-test-only'})});
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const payload={version:1,departments:[],processes:[],automations:[]};
 assert.equal((await fetch(endpoint,{method:'PUT',headers:{Cookie:cookie,Origin:'https://supersussystem.com','Content-Type':'application/json'},body:JSON.stringify({value:payload})})).status,200,'Production origin must work behind a reverse proxy with an internal Host');
 assert.equal((await fetch(endpoint,{method:'PUT',headers:{Cookie:cookie,Origin:'https://unrelated.example','Content-Type':'application/json'},body:JSON.stringify({value:payload})})).status,403,'Cross-origin write blocked');
 assert.equal((await fetch(endpoint,{method:'PUT',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({value:payload})})).status,200);
 const read=await fetch(endpoint,{headers:{Cookie:cookie}});assert.equal(read.status,200);assert.deepEqual((await read.json()).value,payload);
 assert.equal((await fetch(base+'/api/content/supersus.teamGraph.v3')).status,200,'Existing team access not changed');
 console.log('Departments API: anonymous read/write denied, same-origin authenticated save/read passed, cross-origin denied, team unchanged');
}finally{child.kill();await new Promise(r=>child.once('exit',r));await rm(dir,{recursive:true,force:true});}
