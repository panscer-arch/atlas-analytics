import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LogIn, LogOut, Minus, Plus, Users, Maximize2, Minimize2, Pause, Play, RotateCcw, LocateFixed } from 'lucide-react';
import { createOfficeScene } from '../utils/officeScene';
import { demoPeople, activityNames } from '../utils/officeDemo';
import { actionTarget } from '../utils/officeLayout';
import { hasSavedOfficeSession, useOfficePresence } from '../utils/useOfficePresence';
import '../styles/teamOffice.css';

const statuses = { available: 'В офисе', focus: 'Занят', meeting: 'На встрече', break: 'Перерыв' };
const presenceLabel=p=>p?(p.demo?activityNames[p.activity]:statuses[p.status]):'Не в сети';

export default function TeamOffice({ members, projectIdsByMember, projectById }) {
  const host = useRef(null), scene = useRef(null), labels = useRef(null);
  const [demo,setDemo]=useState(()=>!hasSavedOfficeSession()),[demoTime,setDemoTime]=useState(0);
  const presence=useOfficePresence(!demo);
  const {people,myId,choice,setChoice,status,setStatus,task,setTask,joining,join,leave,position}=presence;
  const connected=presence.connection==='connected';
  const [selected,setSelected]=useState(''),[sceneError,setError]=useState('');
  const error=sceneError||(!demo&&presence.error);
  const [expanded,setExpanded]=useState(false),[paused,setPaused]=useState(false);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[project,setProject]=useState('all');
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  const displayedPeople=demo?demoPeople(members,demoTime):people;
  const person=members.find(m=>m.id===selected)||members.find(m=>m.id===myId);
  const active=person&&displayedPeople.find(p=>p.memberId===person.id);
  const online=new Map(displayedPeople.map(p=>[p.memberId,p]));
  const shownMembers=members.filter(m=>`${m.data.label} ${m.data.role||''}`.toLowerCase().includes(query.trim().toLowerCase())
    &&(filter==='all'||(online.get(m.id)?.status||'offline')===filter)
    &&(project==='all'||(projectIdsByMember.get(m.id)||[]).includes(project)));
  useEffect(()=>{if(!demo||paused||reduced)return;let last=performance.now();const timer=setInterval(()=>{const now=performance.now();setDemoTime(t=>t+Math.min((now-last)/1000,.25));last=now;},100);return()=>clearInterval(timer);},[demo,paused,reduced]);
  useEffect(()=>{if(!expanded)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';const close=e=>{if(e.key==='Escape')setExpanded(false);};window.addEventListener('keydown',close);return()=>{document.body.style.overflow=overflow;window.removeEventListener('keydown',close);};},[expanded]);
  async function changeMode(value){if(value===demo)return;if(value&&!(await leave()))return;setSelected('');setError('');setDemo(value);scene.current?.reset();}
  const memberKey = members.map(m=>`${m.id}:${m.data.label}`).join('|');
  useEffect(()=>{
    if(!host.current)return;
    try {
      scene.current=createOfficeScene(host.current,members,setSelected,p=>{position.current=p;},positions=>{
        for(const p of positions){const node=labels.current?.querySelector(`[data-member="${CSS.escape(p.id)}"]`);if(node){node.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;node.style.visibility=p.visible?'visible':'hidden';}}
      });
    }catch{setError('Браузер не смог открыть 3D. Попробуйте включить аппаратное ускорение.');}
    return()=>{scene.current?.dispose();scene.current=null;};
  },[memberKey]);
  useEffect(()=>{scene.current?.update(displayedPeople,demo?'':myId,selected);},[people,myId,selected,memberKey,demo,demoTime]);

  useEffect(()=>{scene.current?.pause(reduced||(demo&&paused));},[demo,paused,reduced,memberKey]);
  function go(activity){
    const index=members.findIndex(m=>m.id===myId);if(index<0)return;
    const p=actionTarget(activity,index);
    if(!scene.current?.walk(p.x,p.z)){setError('Не найден свободный путь. Выберите другое место.');return;}
    setError('');presence.setActivity(activity);setStatus(activity==='work'?'focus':activity==='meeting'?'meeting':'break');
  }
  return <div className={`team-office ${expanded?'is-expanded':''}`}>
    <div className="office-topbar">
      <div><span className="office-eyebrow">SUPERSUS / WORKSPACE</span><h3>Наш офис<span className="office-preview">{demo?'Демо · анимация персонажей': 'Бета · реальные участники'}</span></h3></div>
      <div className="office-mode"><button aria-pressed={demo} onClick={()=>changeMode(true)}>Демо</button><button aria-pressed={!demo} onClick={()=>changeMode(false)}>Реальные участники</button><button aria-label={expanded?'Свернуть офис':'Развернуть офис'} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button><span className="office-live" role="status">{demo?`${displayedPeople.length} персонажей`:connected?`${people.length} в офисе`:presence.connection==='connecting'?'Подключение…':presence.connection==='unauthorized'?'Нужен вход':'Переподключение…'}</span></div>
    </div>
    <div className="office-workspace">
      <div className="office-world">
        <div ref={host} className="office-canvas" aria-label="Трёхмерный виртуальный офис"/>
        <div ref={labels} className="office-labels">{members.slice(0,16).map(m=><button key={m.id} data-member={m.id} className={`office-name ${online.has(m.id)?'is-online':''} ${m.id===selected?'is-selected':''}`} onClick={()=>setSelected(m.id)}><i/>{m.data.label}{m.id===myId?' · Вы':''}</button>)}</div>
        <div className="office-scene-title"><span>01 / HEADQUARTERS</span><strong>Место для всей команды.</strong></div>
        <div className="office-camera" aria-label="Камера офиса">
          {demo?<button disabled={reduced} aria-label={paused?'Продолжить анимацию':'Пауза анимации'} aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button>:null}
          <button aria-label="Общий вид" onClick={()=>scene.current?.reset()}><RotateCcw size={17}/></button>
          <button aria-label="Повернуть влево" onClick={()=>scene.current?.rotate(-.22)}><ArrowLeft size={17}/></button>
          <button aria-label="Повернуть вправо" onClick={()=>scene.current?.rotate(.22)}><ArrowRight size={17}/></button>
          <span/>
          <button aria-label="Приблизить" onClick={()=>scene.current?.zoom(-3)}><Plus size={17}/></button>
          <button aria-label="Отдалить" onClick={()=>scene.current?.zoom(3)}><Minus size={17}/></button>
        </div>
        <div className="office-hint">{demo?(paused?'Демо на паузе':'Демонстрация · не реальные статусы сотрудников'):myId?'Нажмите на свободное место, чтобы пройти туда':'Выберите сотрудника и войдите в офис'}<span>Нажмите на имя — откроется карточка</span></div>
      </div>
      <aside className="office-sidebar">
        {demo?<div className="office-entry"><span className="office-eyebrow">ЖИВОЙ ОФИС · ДЕМО</span><h4>У каждого свои дела</h4><p>Работа, обед, встречи и отдых. Это постановочная анимация, а не наблюдение за сотрудниками.</p></div>:null}
        <div hidden={demo}>
        {!myId?<div className="office-entry"><span className="office-eyebrow">ВАШЕ РАБОЧЕЕ МЕСТО</span><h4>Заходите, располагайтесь</h4><p>Выберите персонажа для проверки офиса.</p><label>Сотрудник<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Выбрать из команды</option>{members.slice(0,16).map(m=><option value={m.id} key={m.id} disabled={online.has(m.id)}>{m.data.label}{online.has(m.id)?' · в офисе':''}</option>)}</select></label><button className="office-primary" onClick={join} disabled={!choice||!connected||joining}><LogIn size={16}/>{joining?'Подключение…':'Войти в офис'}</button></div>:<div className="office-entry"><span className="office-eyebrow">ВЫ В ОФИСЕ</span><h4>{members.find(m=>m.id===myId)?.data.label}</h4><label>Мой статус<select value={status} onChange={e=>{setStatus(e.target.value);presence.setActivity('idle');}}>{Object.entries(statuses).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Над чем работаю<input value={task} maxLength={140} onChange={e=>setTask(e.target.value)} placeholder="Например, макеты вебинаров"/></label><div className="office-actions">{[['work','За стол'],['meeting','В переговорку'],['eat','На обед'],['rest','Отдыхать']].map(([id,label])=><button key={id} disabled={!connected} aria-pressed={presence.activity===id} onClick={()=>go(id)}>{label}</button>)}</div><button className="office-leave" onClick={leave}><LogOut size={14}/>Выйти из офиса</button></div>}
        </div>
        {error?<p role="alert" className="office-error">{error}{!demo&&!connected?<button onClick={presence.retry}>Повторить подключение</button>:null}</p>:null}
        {person?<div className="office-person"><div className="office-person-heading"><div className="office-initials">{person.data.initials||person.data.label.slice(0,2)}</div><div><strong>{person.data.label}</strong><button className="office-locate" aria-label={`Показать ${person.data.label} в офисе`} onClick={()=>scene.current?.focus(person.id)}><LocateFixed size={16}/></button><span>{presenceLabel(active)}</span></div></div><p>{person.data.role}</p>{active?.task?<blockquote>{active.task}</blockquote>:null}<span className="office-eyebrow">ПРОЕКТЫ</span><ul>{(projectIdsByMember.get(person.id)||[]).map(id=><li key={id}>{projectById.get(id)?.data.label}</li>)}</ul></div>:null}
        <div className="office-roster"><span className="office-eyebrow"><Users size={13}/>КОМАНДА · {shownMembers.length} / {members.length}</span><div className="office-filters"><input aria-label="Найти сотрудника в офисе" placeholder="Имя или роль" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Фильтр по статусу" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Все статусы</option>{Object.entries({...statuses,offline:'Не в сети'}).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><select aria-label="Фильтр по проекту" value={project} onChange={e=>setProject(e.target.value)}><option value="all">Все проекты</option>{[...projectById].map(([id,p])=><option key={id} value={id}>{p.data.label}</option>)}</select></div>{shownMembers.map(m=><button key={m.id} onClick={()=>{setSelected(m.id);scene.current?.focus(m.id);}}><i className={online.has(m.id)?'is-online':''}/><span>{m.data.label}</span><small>{presenceLabel(online.get(m.id))}</small></button>)}{!shownMembers.length?<p>Никого не найдено.</p>:null}{query||filter!=='all'||project!=='all'?<button onClick={()=>{setQuery('');setFilter('all');setProject('all');}}>Сбросить фильтры</button>:null}</div>
      </aside>
    </div>
  </div>;
}
