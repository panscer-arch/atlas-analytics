import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CirclePlus, Filter, Save, X } from "lucide-react";
import {
  LAUNCH_CALENDAR_AREAS,
  LAUNCH_CHANGE_AREAS,
  LAUNCH_CHANGE_STATUSES,
  LAUNCH_CHANGE_TYPES,
  LAUNCH_CALENDAR_OWNERS,
  LAUNCH_CALENDAR_PRIORITIES,
  LAUNCH_CALENDAR_STATUSES,
  LAUNCH_CALENDAR_STORAGE_KEY,
  LAUNCH_CHANGE_LOG_STORAGE_KEY,
  defaultLaunchCalendarEvents,
} from "../data/launchCalendarData";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import "./LaunchCalendarBoard.css";

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

function readLocalContent(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalContent(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Локальный fallback не должен блокировать серверное сохранение.
  }
}

function clearLocalContent(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Серверное сохранение уже подтверждено, локальная копия больше не нужна.
  }
}

function monthKeyFromDate(date) {
  return date.slice(0, 7);
}

function normalizeEvent(event = {}) {
  return {
    id: event.id || `launch-calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: /^\d{4}-\d{2}-\d{2}$/.test(event.date || "") ? event.date : "2026-08-01",
    time: /^\d{2}:\d{2}$/.test(event.time || "") ? event.time : "10:00",
    title: String(event.title || "").trim(),
    area: LAUNCH_CALENDAR_AREAS.includes(event.area) ? event.area : LAUNCH_CALENDAR_AREAS[0],
    owner: String(event.owner || "").trim(),
    status: LAUNCH_CALENDAR_STATUSES.includes(event.status) ? event.status : "Запланировано",
    priority: LAUNCH_CALENDAR_PRIORITIES.includes(event.priority) ? event.priority : "Средний",
    note: String(event.note || "").trim(),
  };
}

function normalizeEvents(value) {
  return Array.isArray(value) ? value.map(normalizeEvent).filter((event) => event.title) : defaultLaunchCalendarEvents.map(normalizeEvent);
}

function createEvent(date = "2026-08-01") {
  return normalizeEvent({ date, title: "", area: "Оперативное управление", owner: "", status: "Запланировано", priority: "Средний", time: "10:00", note: "" });
}

function createChange() {
  return {
    id: `launch-change-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    area: "Маркетинг",
    type: "Обновление",
    status: "Черновик",
    title: "",
    details: "",
    url: "",
  };
}

function normalizeChange(change = {}) {
  return {
    id: change.id || `launch-change-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: change.createdAt || new Date().toISOString(),
    area: LAUNCH_CHANGE_AREAS.includes(change.area) ? change.area : "Операционное",
    type: LAUNCH_CHANGE_TYPES.includes(change.type) ? change.type : "Обновление",
    status: LAUNCH_CHANGE_STATUSES.includes(change.status) ? change.status : "Черновик",
    title: String(change.title || "").trim(),
    details: String(change.details || "").trim(),
    url: String(change.url || "").trim(),
    source: change.source === "calendar" ? "calendar" : "manual",
    sourceEventId: String(change.sourceEventId || "").trim(),
  };
}

function normalizeChanges(value) {
  return Array.isArray(value) ? value.map(normalizeChange).filter((change) => change.title) : [];
}

function formatChangeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Без даты";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function isoDate(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthDays(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const previousMonthDays = new Date(year, month - 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const day = index - offset + 1;
    if (day < 1) cells.push({ date: isoDate(year, month - 2, previousMonthDays + day), day: previousMonthDays + day, inMonth: false });
    else if (day > days) cells.push({ date: isoDate(year, month, day - days), day: day - days, inMonth: false });
    else cells.push({ date: isoDate(year, month - 1, day), day, inMonth: true });
  }

  return cells;
}

function getAreaClass(area) {
  return {
    "Оперативное управление": "ops",
    "Техническая поддержка": "support",
    "Маркетинг и PR": "marketing",
    "Сайт и кабинет": "product",
    "Аналитика и развитие": "analytics",
  }[area] || "ops";
}

function getStatusClass(status) {
  return {
    "Запланировано": "planned",
    "В работе": "active",
    "На согласовании": "review",
    "Готово": "done",
    "Блокер": "blocked",
  }[status] || "planned";
}

function monitorAreaFromCalendarArea(area) {
  return {
    "Оперативное управление": "Операционное",
    "Техническая поддержка": "Поддержка",
    "Маркетинг и PR": "Маркетинг",
    "Сайт и кабинет": "Сайт и кабинет",
    "Аналитика и развитие": "Аналитика",
  }[area] || "Операционное";
}

function makeCalendarMonitorEntry(previousEvent, nextEvent) {
  const isCompleted = nextEvent.status === "Готово";
  const isBlocked = nextEvent.status === "Блокер";
  const label = isCompleted ? "Завершено" : isBlocked ? "Блокер" : `Статус: ${nextEvent.status}`;
  return normalizeChange({
    id: `calendar-monitor-${nextEvent.id}-${nextEvent.status}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    area: monitorAreaFromCalendarArea(nextEvent.area),
    type: isBlocked ? "Инцидент" : isCompleted ? "Решение" : "Обновление",
    status: isCompleted || isBlocked ? "Готово для чата" : "Черновик",
    title: `${label}: ${nextEvent.title || "Событие календаря"}`,
    details: `Из календаря запуска. Статус: «${previousEvent.status}» → «${nextEvent.status}». ${nextEvent.date}${nextEvent.time ? `, ${nextEvent.time}` : ""}. Направление: ${nextEvent.area}. Ответственный: ${nextEvent.owner || "не назначен"}.${nextEvent.note ? ` ${nextEvent.note}` : ""}`,
    source: "calendar",
    sourceEventId: nextEvent.id,
  });
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export default function LaunchCalendarBoard() {
  const [events, setEvents] = useState(() => normalizeEvents(defaultLaunchCalendarEvents));
  const [changes, setChanges] = useState([]);
  const [activeMonth, setActiveMonth] = useState("2026-08");
  const [selectedId, setSelectedId] = useState("launch-2026-08-01-opening");
  const [selectedChangeId, setSelectedChangeId] = useState("");
  const [isChangeFormOpen, setIsChangeFormOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("Все");
  const [areaFilter, setAreaFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [isLoaded, setIsLoaded] = useState(false);
  const [areChangesLoaded, setAreChangesLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Сохранено");
  const saveRequestRef = useRef(0);
  const changeSaveRequestRef = useRef(0);
  const hasInitializedEventsRef = useRef(false);
  const hasInitializedChangesRef = useRef(false);
  const shouldSyncEventsRef = useRef(false);
  const shouldSyncChangesRef = useRef(false);

  useEffect(() => {
    let active = true;
    loadServerContent(LAUNCH_CALENDAR_STORAGE_KEY).then((saved) => {
      if (!active) return;
      const local = readLocalContent(LAUNCH_CALENDAR_STORAGE_KEY);
      shouldSyncEventsRef.current = Array.isArray(local);
      setEvents(normalizeEvents(local ?? saved));
      setIsLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    loadServerContent(LAUNCH_CHANGE_LOG_STORAGE_KEY).then((saved) => {
      if (!active) return;
      const local = readLocalContent(LAUNCH_CHANGE_LOG_STORAGE_KEY);
      shouldSyncChangesRef.current = Array.isArray(local);
      setChanges(normalizeChanges(local ?? saved));
      setAreChangesLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return undefined;
    if (!hasInitializedEventsRef.current) {
      hasInitializedEventsRef.current = true;
      if (!shouldSyncEventsRef.current) return undefined;
    }
    const timer = window.setTimeout(() => {
      const requestId = saveRequestRef.current + 1;
      saveRequestRef.current = requestId;
      setSaveState("Сохраняю...");
      const normalized = normalizeEvents(events);
      saveLocalContent(LAUNCH_CALENDAR_STORAGE_KEY, normalized);
      saveServerContent(LAUNCH_CALENDAR_STORAGE_KEY, normalized).then((ok) => {
        if (ok) {
          shouldSyncEventsRef.current = false;
          clearLocalContent(LAUNCH_CALENDAR_STORAGE_KEY);
        }
        if (saveRequestRef.current === requestId) setSaveState(ok ? "Сохранено на сервере" : "Сохранено локально");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [events, isLoaded]);

  useEffect(() => {
    if (!areChangesLoaded) return undefined;
    if (!hasInitializedChangesRef.current) {
      hasInitializedChangesRef.current = true;
      if (!shouldSyncChangesRef.current) return undefined;
    }
    const timer = window.setTimeout(() => {
      const requestId = changeSaveRequestRef.current + 1;
      changeSaveRequestRef.current = requestId;
      const normalized = normalizeChanges(changes);
      saveLocalContent(LAUNCH_CHANGE_LOG_STORAGE_KEY, normalized);
      saveServerContent(LAUNCH_CHANGE_LOG_STORAGE_KEY, normalized).then((ok) => {
        if (ok) {
          shouldSyncChangesRef.current = false;
          clearLocalContent(LAUNCH_CHANGE_LOG_STORAGE_KEY);
        }
        if (changeSaveRequestRef.current === requestId && !ok) setSaveState("Изменения сохранены локально");
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [areChangesLoaded, changes]);

  const ownerOptions = useMemo(() => Array.from(new Set([...LAUNCH_CALENDAR_OWNERS, ...events.map((event) => event.owner).filter(Boolean)])), [events]);
  const monthEvents = useMemo(() => events.filter((event) => monthKeyFromDate(event.date) === activeMonth), [activeMonth, events]);
  const filteredEvents = useMemo(() => monthEvents
    .filter((event) => ownerFilter === "Все" || event.owner === ownerFilter)
    .filter((event) => areaFilter === "Все" || event.area === areaFilter)
    .filter((event) => statusFilter === "Все" || event.status === statusFilter), [areaFilter, monthEvents, ownerFilter, statusFilter]);
  const eventsByDate = useMemo(() => filteredEvents.reduce((result, event) => {
    result[event.date] = [...(result[event.date] || []), event].sort((a, b) => a.time.localeCompare(b.time));
    return result;
  }, {}), [filteredEvents]);
  const selectedEvent = events.find((event) => event.id === selectedId) || null;
  const selectedChange = changes.find((change) => change.id === selectedChangeId) || null;
  const monthDays = useMemo(() => getMonthDays(activeMonth), [activeMonth]);
  const stats = useMemo(() => ({
    total: monthEvents.length,
    active: monthEvents.filter((event) => event.status === "В работе").length,
    blockers: monthEvents.filter((event) => event.status === "Блокер").length,
    unassigned: monthEvents.filter((event) => !event.owner).length,
  }), [monthEvents]);

  function patchEvent(id, patch) {
    const currentEvent = events.find((event) => event.id === id);
    const nextEvent = currentEvent ? normalizeEvent({ ...currentEvent, ...patch }) : null;
    const nextEvents = events.map((event) => (event.id === id ? normalizeEvent({ ...event, ...patch }) : event));
    saveLocalContent(LAUNCH_CALENDAR_STORAGE_KEY, normalizeEvents(nextEvents));
    shouldSyncEventsRef.current = true;
    setEvents(nextEvents);
    if (nextEvent && patch.status && patch.status !== currentEvent.status) {
      const monitorEntry = makeCalendarMonitorEntry(currentEvent, nextEvent);
      const nextChanges = [monitorEntry, ...changes];
      saveLocalContent(LAUNCH_CHANGE_LOG_STORAGE_KEY, normalizeChanges(nextChanges));
      shouldSyncChangesRef.current = true;
      setChanges(nextChanges);
      setSelectedChangeId(monitorEntry.id);
    }
  }

  function changeMonth(delta) {
    const [year, month] = activeMonth.split("-").map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setActiveMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  function createForDate(date) {
    const next = createEvent(date);
    const nextEvents = [...events, next];
    saveLocalContent(LAUNCH_CALENDAR_STORAGE_KEY, normalizeEvents(nextEvents));
    shouldSyncEventsRef.current = true;
    setEvents(nextEvents);
    setSelectedId(next.id);
  }

  function removeSelected() {
    if (!selectedEvent) return;
    if (!window.confirm(`Удалить событие «${selectedEvent.title || "Без названия"}»?`)) return;
    const nextEvents = events.filter((event) => event.id !== selectedEvent.id);
    saveLocalContent(LAUNCH_CALENDAR_STORAGE_KEY, normalizeEvents(nextEvents));
    shouldSyncEventsRef.current = true;
    setEvents(nextEvents);
    setSelectedId("");
  }

  function addChange() {
    const next = createChange();
    const nextChanges = [next, ...changes];
    saveLocalContent(LAUNCH_CHANGE_LOG_STORAGE_KEY, normalizeChanges(nextChanges));
    shouldSyncChangesRef.current = true;
    setChanges(nextChanges);
    setSelectedChangeId(next.id);
    setIsChangeFormOpen(true);
  }

  function patchChange(id, patch) {
    const nextChanges = changes.map((change) => (change.id === id ? normalizeChange({ ...change, ...patch }) : change));
    saveLocalContent(LAUNCH_CHANGE_LOG_STORAGE_KEY, normalizeChanges(nextChanges));
    shouldSyncChangesRef.current = true;
    setChanges(nextChanges);
  }

  function deleteChange(id) {
    const change = changes.find((item) => item.id === id);
    if (!change || !window.confirm(`Удалить запись «${change.title || "Без названия"}»?`)) return;
    const nextChanges = changes.filter((item) => item.id !== id);
    saveLocalContent(LAUNCH_CHANGE_LOG_STORAGE_KEY, normalizeChanges(nextChanges));
    shouldSyncChangesRef.current = true;
    setChanges(nextChanges);
    setSelectedChangeId("");
    setIsChangeFormOpen(false);
  }

  return (
    <section className="launch-calendar analytics-surface">
      <header className="launch-calendar-header">
        <div>
          <span className="analytics-kicker">Операционный центр</span>
          <h2>Календарь запуска</h2>
          <p>План запуска Atlas: оперативка, поддержка, маркетинг, развитие сайта и аналитика. Все события редактируются и сохраняются на сервере.</p>
        </div>
        <div className="launch-calendar-status" aria-live="polite"><Save size={16} /> {saveState}</div>
      </header>

      <section className="launch-calendar-metrics" aria-label="Сводка по выбранному месяцу">
        <article><span>События месяца</span><strong>{stats.total}</strong><small>{monthLabel(activeMonth)}</small></article>
        <article><span>В работе</span><strong>{stats.active}</strong><small>текущий фокус</small></article>
        <article className={stats.blockers ? "is-warning" : ""}><span>Блокеры</span><strong>{stats.blockers}</strong><small>нужна эскалация</small></article>
        <article className={stats.unassigned ? "is-warning" : ""}><span>Без владельца</span><strong>{stats.unassigned}</strong><small>назначить ответственного</small></article>
      </section>

      <div className="launch-calendar-toolbar">
        <div className="launch-calendar-month-nav" aria-label="Навигация по месяцам">
          <button type="button" title="Предыдущий месяц" aria-label="Предыдущий месяц" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
          <strong>{monthLabel(activeMonth)}</strong>
          <button type="button" title="Следующий месяц" aria-label="Следующий месяц" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
        </div>
        <div className="launch-calendar-filters">
          <span><Filter size={15} /> Фильтры</span>
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} aria-label="Направление"><option>Все</option>{LAUNCH_CALENDAR_AREAS.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} aria-label="Ответственный"><option>Все</option>{ownerOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Статус"><option>Все</option>{LAUNCH_CALENDAR_STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <button type="button" className="launch-calendar-add" onClick={() => createForDate(`${activeMonth}-01`)}><CirclePlus size={18} /> Добавить событие</button>
      </div>

      <div className="launch-calendar-layout">
        <section className="launch-calendar-grid-wrap" aria-label={`Календарь: ${monthLabel(activeMonth)}`}>
          <div className="launch-calendar-weekdays">{WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="launch-calendar-grid">
            {monthDays.map((cell) => {
              const dayEvents = eventsByDate[cell.date] || [];
              return (
                <article key={cell.date} className={`launch-calendar-day${cell.inMonth ? "" : " is-outside"}`}>
                  <div className="launch-calendar-day-head"><span>{cell.day}</span><button type="button" title={`Добавить событие на ${cell.date}`} aria-label={`Добавить событие на ${cell.date}`} onClick={() => createForDate(cell.date)}><CirclePlus size={15} /></button></div>
                  <div className="launch-calendar-events">
                    {dayEvents.slice(0, 3).map((event) => <button key={event.id} type="button" onClick={() => setSelectedId(event.id)} className={`launch-calendar-event area-${getAreaClass(event.area)} status-${getStatusClass(event.status)}${selectedId === event.id ? " is-selected" : ""}`}>
                      <time>{event.time}</time><span>{event.title}</span>
                    </button>)}
                    {dayEvents.length > 3 ? <button type="button" className="launch-calendar-more" onClick={() => setSelectedId(dayEvents[3].id)}>Еще: {dayEvents.length - 3}</button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="launch-calendar-editor" aria-label="Редактор события">
          {selectedEvent ? <>
            <div className="launch-calendar-editor-head"><div><span>Событие</span><strong>{selectedEvent.date}</strong></div><button type="button" title="Закрыть редактор" aria-label="Закрыть редактор" onClick={() => setSelectedId("")}><X size={17} /></button></div>
            <label>Название<input value={selectedEvent.title} onChange={(event) => patchEvent(selectedEvent.id, { title: event.target.value })} placeholder="Что нужно сделать" /></label>
            <div className="launch-calendar-editor-row"><label>Дата<input type="date" value={selectedEvent.date} onChange={(event) => patchEvent(selectedEvent.id, { date: event.target.value })} /></label><label>Время<input type="time" value={selectedEvent.time} onChange={(event) => patchEvent(selectedEvent.id, { time: event.target.value })} /></label></div>
            <label>Направление<select value={selectedEvent.area} onChange={(event) => patchEvent(selectedEvent.id, { area: event.target.value })}>{LAUNCH_CALENDAR_AREAS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Ответственный<select value={selectedEvent.owner} onChange={(event) => patchEvent(selectedEvent.id, { owner: event.target.value })}><option value="">Не назначен</option>{ownerOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="launch-calendar-editor-row"><label>Статус<select value={selectedEvent.status} onChange={(event) => patchEvent(selectedEvent.id, { status: event.target.value })}>{LAUNCH_CALENDAR_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Приоритет<select value={selectedEvent.priority} onChange={(event) => patchEvent(selectedEvent.id, { priority: event.target.value })}>{LAUNCH_CALENDAR_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label></div>
            <label>Примечание<textarea rows="5" value={selectedEvent.note} onChange={(event) => patchEvent(selectedEvent.id, { note: event.target.value })} placeholder="Контекст, следующий шаг, материалы или риск" /></label>
            <button type="button" className="launch-calendar-delete" onClick={removeSelected}>Удалить событие</button>
          </> : <div className="launch-calendar-empty"><CirclePlus size={25} /><strong>Выберите событие</strong><p>Нажмите на карточку в календаре или добавьте новое событие в нужный день.</p></div>}
        </aside>
      </div>

      <footer className="launch-calendar-legend" aria-label="Направления">
        {LAUNCH_CALENDAR_AREAS.map((area) => <span key={area}><i className={`area-${getAreaClass(area)}`} />{area}</span>)}
      </footer>

      <section className="launch-changes analytics-surface" aria-label="Монитор изменений">
        <div className="launch-changes-head">
          <div><span className="analytics-kicker">Командная осведомленность</span><h3>Монитор изменений</h3><p>Смена статуса календарного события попадает сюда автоматически. Завершения и блокеры сразу становятся в очередь Telegram-бота; внешние публикации и решения можно добавить вручную.</p></div>
          <button type="button" className="launch-calendar-add" onClick={addChange}><CirclePlus size={18} /> Новое изменение</button>
        </div>
        <div className="launch-changes-layout">
          <div className="launch-changes-feed">
            {changes.length ? changes.map((change) => <button type="button" key={change.id} className={`launch-change-item${selectedChangeId === change.id ? " is-selected" : ""}`} onClick={() => { setSelectedChangeId(change.id); setIsChangeFormOpen(true); }}>
              <span className={`launch-change-area ${change.area === "Маркетинг" ? "is-marketing" : change.area === "Сайт и кабинет" ? "is-product" : "is-default"}`}>{change.area}</span>
              <div><strong>{change.title}</strong><small>{change.type} · {formatChangeDate(change.createdAt)}</small></div>
              <div className="launch-change-tags">{change.source === "calendar" ? <em className="launch-change-source">Календарь</em> : null}<em className={`launch-change-status ${change.status === "Готово для чата" ? "is-queued" : change.status === "Отправлено" ? "is-sent" : ""}`}>{change.status}</em></div>
            </button>) : <div className="launch-changes-empty"><strong>Пока нет зафиксированных изменений</strong><p>Добавьте публикацию, релиз, исправление или решение. Бот не будет слать пустые технические сигналы.</p></div>}
          </div>
          {isChangeFormOpen && selectedChange ? <div className="launch-change-editor">
            <div className="launch-calendar-editor-head"><div><span>Запись в логе</span><strong>{formatChangeDate(selectedChange.createdAt)}</strong></div><button type="button" title="Закрыть редактор" aria-label="Закрыть редактор" onClick={() => setIsChangeFormOpen(false)}><X size={17} /></button></div>
            <label>Что изменилось<input value={selectedChange.title} onChange={(event) => patchChange(selectedChange.id, { title: event.target.value })} placeholder="Например: опубликована статья на ..." /></label>
            <div className="launch-calendar-editor-row"><label>Раздел<select value={selectedChange.area} onChange={(event) => patchChange(selectedChange.id, { area: event.target.value })}>{LAUNCH_CHANGE_AREAS.map((item) => <option key={item}>{item}</option>)}</select></label><label>Тип<select value={selectedChange.type} onChange={(event) => patchChange(selectedChange.id, { type: event.target.value })}>{LAUNCH_CHANGE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label></div>
            <label>Статус для чата<select value={selectedChange.status} onChange={(event) => patchChange(selectedChange.id, { status: event.target.value })}>{LAUNCH_CHANGE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Ссылка<input type="url" value={selectedChange.url} onChange={(event) => patchChange(selectedChange.id, { url: event.target.value })} placeholder="https://..." /></label>
            <label>Короткая суть<textarea rows="4" value={selectedChange.details} onChange={(event) => patchChange(selectedChange.id, { details: event.target.value })} placeholder="Что произошло и что это значит для команды" /></label>
            <button type="button" className="launch-calendar-delete" onClick={() => deleteChange(selectedChange.id)}>Удалить запись</button>
          </div> : <div className="launch-changes-empty"><strong>Выберите запись</strong><p>Откройте изменение из ленты, чтобы дополнить детали или поставить его в очередь для чата.</p></div>}
        </div>
      </section>
    </section>
  );
}
