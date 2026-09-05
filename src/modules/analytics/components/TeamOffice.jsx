import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Coffee, LogIn, LogOut, Minus, Plus, Armchair, Users } from 'lucide-react';
import { createOfficeScene, deskPosition } from '../utils/officeScene';
import '../styles/teamOffice.css';

const statuses = { available: 'В офисе', focus: 'Занят', meeting: 'На встрече', break: 'Перерыв' };
const OFFICE_API = import.meta.env.DEV ? '/api/office' : '/api/content/office-presence';

export default function TeamOffice({ members, projectIdsByMember, projectById }) {
  const host = useRef(null), scene = useRef(null), labels = useRef(null);
  const session = useRef(null), position = useRef({ x: 0, z: 9 });
  const [people, setPeople] = useState([]), [myId, setMyId] = useState('');
  const [choice, setChoice] = useState(''), [selected, setSelected] = useState('');
  const [status, setStatus] = useState('available'), [task, setTask] = useState('');
  const [error, setError] = useState(''), [connected, setConnected] = useState(false), [joining, setJoining] = useState(false);
  const state = useRef({ status, task }); state.current = { status, task };
  const person = members.find(m => m.id === selected) || members.find(m => m.id === myId);
  const active = person && people.find(p => p.memberId === person.id);
  const online = new Map(people.map(p => [p.memberId,p]));

  async function request(body) {
    const response = await fetch(OFFICE_API, body ? { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) } : { cache:'no-store', credentials:'include' });
    const data = await response.json();
    if(!response.ok) {const e=new Error(data.error||'Сервер офиса недоступен');e.status=response.status;throw e;}
    if(!Array.isArray(data.people)) throw new Error('Сервер офиса подключается. Повторите через минуту.');
    return data;
  }
  useEffect(() => {
    let cancelled=false, timer;
    const poll=async()=>{
      try {
        const data=await request(session.current ? {token:session.current,action:'update',...position.current,...state.current} : null);
        if(!cancelled){setPeople(data.people);setConnected(true);}
      } catch(e) {
        if(!cancelled){setConnected(false);setPeople([]);setError(e.message);if(e.status===401){session.current=null;setMyId('');}}
      }
      if(!cancelled)timer=setTimeout(poll,800);
    };
    poll();
    const leaveOnClose=()=>{if(session.current)navigator.sendBeacon(OFFICE_API,new Blob([JSON.stringify({action:'leave',token:session.current})],{type:'application/json'}));};
    window.addEventListener('pagehide',leaveOnClose);
    return()=>{cancelled=true;clearTimeout(timer);leaveOnClose();session.current=null;window.removeEventListener('pagehide',leaveOnClose);};
  },[]);
  const memberKey = members.map(m=>m.id).join('|');
  useEffect(()=>{
    if(!host.current)return;
    try {
      scene.current=createOfficeScene(host.current,members,setSelected,p=>{position.current=p;},positions=>{
        for(const p of positions){const node=labels.current?.querySelector(`[data-member="${CSS.escape(p.id)}"]`);if(node){node.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;node.style.visibility=p.visible?'visible':'hidden';}}
      });
    }catch{setError('Браузер не смог открыть 3D. Попробуйте включить аппаратное ускорение.');}
    return()=>{scene.current?.dispose();scene.current=null;};
  },[memberKey]);
  useEffect(()=>{scene.current?.update(people,myId,selected);},[people,myId,selected,memberKey]);

  async function join() {
    if(!choice||joining)return;setJoining(true);setError('');
    try {const data=await request({action:'join',memberId:choice});session.current=data.token;position.current={x:0,z:9};setMyId(choice);setSelected(choice);setPeople(data.people);}
    catch(e){setError(e.message);}finally{setJoining(false);}
  }
  async function leave() {
    try{await request({action:'leave',token:session.current});session.current=null;setPeople(p=>p.filter(x=>x.memberId!==myId));setMyId('');}
    catch{setError('Не удалось выйти. Повторите попытку.');}
  }
  function goDesk() {
    const index=members.findIndex(m=>m.id===myId);if(index<0)return;
    const p=deskPosition(index);scene.current?.walk(p.x,p.z+1.1);setStatus('focus');
  }
  return <div className="team-office">
    <div className="office-topbar">
      <div><span className="office-eyebrow">SUPERSUS / WORKSPACE</span><h3>Наш офис<span className="office-preview">{import.meta.env.DEV ? 'Локальный прототип' : 'Бета · выбор своего профиля'}</span></h3></div>
      <div className="office-live"><i className={connected?'is-connected':''}/>{connected?`${people.length} в офисе`:'Нет связи'}</div>
    </div>
    <div className="office-workspace">
      <div className="office-world">
        <div ref={host} className="office-canvas" aria-label="Трёхмерный виртуальный офис"/>
        <div ref={labels} className="office-labels">{members.slice(0,16).map(m=><button key={m.id} data-member={m.id} className={`office-name ${online.has(m.id)?'is-online':''} ${m.id===selected?'is-selected':''}`} onClick={()=>setSelected(m.id)}><i/>{m.data.label}{m.id===myId?' · Вы':''}</button>)}</div>
        <div className="office-scene-title"><span>01 / HEADQUARTERS</span><strong>Место для всей команды.</strong></div>
        <div className="office-camera" aria-label="Камера офиса">
          <button aria-label="Повернуть влево" onClick={()=>scene.current?.rotate(-.22)}><ArrowLeft size={17}/></button>
          <button aria-label="Повернуть вправо" onClick={()=>scene.current?.rotate(.22)}><ArrowRight size={17}/></button>
          <span/>
          <button aria-label="Приблизить" onClick={()=>scene.current?.zoom(-3)}><Plus size={17}/></button>
          <button aria-label="Отдалить" onClick={()=>scene.current?.zoom(3)}><Minus size={17}/></button>
        </div>
        <div className="office-hint">{myId?'Нажмите на свободное место, чтобы пройти туда':'Выберите сотрудника и войдите в офис'}<span>Нажмите на имя — откроется карточка</span></div>
      </div>
      <aside className="office-sidebar">
        {!myId?<div className="office-entry"><span className="office-eyebrow">ВАШЕ РАБОЧЕЕ МЕСТО</span><h4>Заходите, располагайтесь</h4><p>Выберите персонажа для проверки офиса.</p><label>Сотрудник<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Выбрать из команды</option>{members.slice(0,16).map(m=><option value={m.id} key={m.id} disabled={online.has(m.id)}>{m.data.label}{online.has(m.id)?' · в офисе':''}</option>)}</select></label><button className="office-primary" onClick={join} disabled={!choice||!connected||joining}><LogIn size={16}/>{joining?'Подключение…':'Войти в офис'}</button></div>:<div className="office-entry"><span className="office-eyebrow">ВЫ В ОФИСЕ</span><h4>{members.find(m=>m.id===myId)?.data.label}</h4><label>Мой статус<select value={status} onChange={e=>setStatus(e.target.value)}>{Object.entries(statuses).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Над чем работаю<input value={task} maxLength={140} onChange={e=>setTask(e.target.value)} placeholder="Например, макеты вебинаров"/></label><div className="office-actions"><button onClick={goDesk}><Armchair size={16}/>К столу</button><button onClick={()=>{scene.current?.walk(8,6);setStatus('break');}}><Coffee size={16}/>Перерыв</button></div><button className="office-leave" onClick={leave}><LogOut size={14}/>Выйти из офиса</button></div>}
        {error?<p role="alert" className="office-error">{error}</p>:null}
        {person?<div className="office-person"><div className="office-person-heading"><div className="office-initials">{person.data.initials||person.data.label.slice(0,2)}</div><div><strong>{person.data.label}</strong><span>{active?statuses[active.status]:'Не в сети'}</span></div></div><p>{person.data.role}</p>{active?.task?<blockquote>{active.task}</blockquote>:null}<span className="office-eyebrow">ПРОЕКТЫ</span><ul>{(projectIdsByMember.get(person.id)||[]).map(id=><li key={id}>{projectById.get(id)?.data.label}</li>)}</ul></div>:null}
        <div className="office-roster"><span className="office-eyebrow"><Users size={13}/>КОМАНДА · {members.length}</span>{members.map(m=><button key={m.id} onClick={()=>setSelected(m.id)}><i className={online.has(m.id)?'is-online':''}/><span>{m.data.label}</span><small>{online.has(m.id)?statuses[online.get(m.id).status]:'Не в сети'}</small></button>)}</div>
      </aside>
    </div>
  </div>;
}
