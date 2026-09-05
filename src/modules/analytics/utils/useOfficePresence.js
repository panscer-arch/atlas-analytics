import { useEffect, useRef, useState } from 'react';
import { readOfficeSession, saveOfficeSession } from './officeSession';
const API=import.meta.env.DEV?'/api/office':'/api/content/office-presence';
const storage=()=>{try{return window.sessionStorage;}catch{return null;}};
export function hasSavedOfficeSession(){return !!readOfficeSession(storage());}
export function useOfficePresence(enabled){
  const session=useRef(null),generation=useRef(0),controllers=useRef(new Set());
  const position=useRef({x:0,z:9}), state=useRef({status:'available',task:'',activity:'idle'});
  const [people,setPeople]=useState([]),[myId,setMyId]=useState(''),[choice,setChoice]=useState('');
  const [status,setStatus]=useState('available'),[task,setTask]=useState(''),[activity,setActivity]=useState('idle');
  const [connection,setConnection]=useState('connecting'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[joining,setJoining]=useState(false),[revision,retry]=useState(0);
  state.current={status,task,activity};
  const clearSession=()=>{session.current=null;saveOfficeSession(storage(),null);setMyId('');};
  async function request(body){
    const controller=new AbortController();controllers.current.add(controller);
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(API,{method:body?'POST':'GET',credentials:'include',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal});
      const data=await response.json();
      if(!response.ok){const e=new Error(data.error||'Сервер офиса недоступен');e.code=data.code;e.status=response.status;throw e;}
      if(!Array.isArray(data.people))throw new Error('Не удалось получить состояние офиса');
      return data;
    }finally{clearTimeout(timeout);controllers.current.delete(controller);}
  }
  useEffect(()=>{
    const version=++generation.current;let timer,failures=0,stopped=false;
    const current=()=>!stopped&&generation.current===version;
    if(!enabled){setPeople([]);setMyId('');setError('');return;}
    const saved=readOfficeSession(storage());session.current=saved?.token||null;
    if(saved)setChoice(saved.memberId);
    let resume=!!session.current;setConnection('connecting');
    async function poll(){
      try{
        const data=await request(resume?{action:'resume',token:session.current}:session.current?{action:'update',token:session.current,...position.current,...state.current}:null);
        if(!current())return;
        if(resume){const me=data.people.find(p=>p.memberId===data.memberId);if(!me)throw new Error('Участник отсутствует в сессии');position.current={x:me.x,z:me.z};state.current={status:me.status,task:me.task,activity:me.activity||'idle'};setMyId(me.memberId);setStatus(me.status);setTask(me.task);setActivity(me.activity||'idle');resume=false;}
        failures=0;setPeople(data.people);setConnection('connected');setError('');
      }catch(e){
        if(!current())return;
        failures++;setConnection('reconnecting');setError(e.name==='AbortError'||e instanceof TypeError?'Связь с офисом потеряна. Переподключаемся автоматически…':e.message);
        if(e.status===401){clearSession();resume=false;setPeople([]);setNotice(e.message);setError('');if(e.code==='auth_required'){setConnection('unauthorized');return;}}
      }
      if(current())timer=setTimeout(poll,failures?Math.min(30000,1500*2**Math.min(failures,5)):1500);
    }
    poll();
    return()=>{stopped=true;++generation.current;clearTimeout(timer);for(const c of controllers.current)c.abort();};
  },[enabled,revision]);
  async function join(){
    if(!choice||joining||!enabled||connection!=='connected')return;
    const version=generation.current;setJoining(true);setNotice('');
    try{const data=await request({action:'join',memberId:choice});
      if(version!==generation.current){request({action:'leave',token:data.token}).catch(()=>{});return;}
      session.current=data.token;saveOfficeSession(storage(),{token:data.token,memberId:choice});position.current={x:0,z:9};state.current={status:'available',task:'',activity:'idle'};setStatus('available');setTask('');setActivity('idle');setMyId(choice);setPeople(data.people);
    }catch(e){if(version===generation.current)setNotice(e.message);}finally{setJoining(false);}
  }
  async function leave(){
    if(session.current){try{await request({action:'leave',token:session.current});}catch(e){setNotice(e.message);return false;}}
    clearSession();setPeople(p=>p.filter(x=>x.memberId!==myId));setNotice('');return true;
  }
  return {people,myId,choice,setChoice,status,setStatus,task,setTask,activity,setActivity,connection,error:error||notice,joining,join,leave,position,retry:()=>retry(n=>n+1)};
}
