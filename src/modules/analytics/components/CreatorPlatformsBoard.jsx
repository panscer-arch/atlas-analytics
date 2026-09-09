import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Globe2,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  CREATOR_PLATFORM_CATEGORIES,
  CREATOR_PLATFORM_CHECKLIST,
  CREATOR_PLATFORM_GEOS,
  CREATOR_PLATFORMS,
} from "../data/creatorPlatformsData";
import "./CreatorPlatformsBoard.css";

const PRIORITIES = ["Все", "A", "B", "C"];

function matchesSearch(platform, query) {
  if (!query) return true;
  const haystack = [
    platform.name,
    platform.categoryLabel,
    platform.geoLabel,
    platform.useCase,
    platform.atlasFit,
  ].join(" ").toLocaleLowerCase("ru-RU");
  return haystack.includes(query.toLocaleLowerCase("ru-RU"));
}

export default function CreatorPlatformsBoard() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [geo, setGeo] = useState("all");
  const [priority, setPriority] = useState("Все");

  const filteredPlatforms = useMemo(() => CREATOR_PLATFORMS.filter((platform) => (
    matchesSearch(platform, query)
    && (category === "all" || platform.category === category)
    && (geo === "all" || platform.geos.includes(geo))
    && (priority === "Все" || platform.priority === priority)
  )), [category, geo, priority, query]);

  const priorityCount = CREATOR_PLATFORMS.filter((platform) => platform.priority === "A").length;

  return (
    <div className="creator-platforms-shell">
      <section className="analytics-surface creator-platforms-header">
        <div className="creator-platforms-heading">
          <a className="creator-platforms-back" href="/?board=marketingOS">
            <ArrowLeft size={17} aria-hidden="true" />
            MarketingOS
          </a>
          <span className="creator-platforms-eyebrow">Creator sourcing</span>
          <h1>UGC и инфлюенсеры</h1>
          <p>Рабочий каталог сервисов для производства контента, поиска авторов и запуска региональных creator-кампаний Atlas.</p>
        </div>
        <div className="creator-platforms-warning">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <strong>Сначала письменный pre-approval</strong>
            <span>Ни одна площадка пока не подтверждена для рекламы Atlas. До оплаты нужно согласовать категорию и формулировки.</span>
          </div>
        </div>
      </section>

      <section className="creator-platforms-kpis" aria-label="Сводка каталога">
        <article className="analytics-surface"><Globe2 size={20} /><span>Площадок</span><strong>{CREATOR_PLATFORMS.length}</strong><small>международные и локальные</small></article>
        <article className="analytics-surface is-accent"><BadgeCheck size={20} /><span>Приоритет A</span><strong>{priorityCount}</strong><small>для первого контакта</small></article>
        <article className="analytics-surface"><UsersRound size={20} /><span>Ключевые гео</span><strong>4</strong><small>India · SEA · Africa · Brazil</small></article>
        <article className="analytics-surface is-warning"><ShieldCheck size={20} /><span>Допуск Atlas</span><strong>0</strong><small>подтверждений пока нет</small></article>
      </section>

      <section className="analytics-surface creator-platforms-controls" aria-label="Фильтры каталога">
        <label className="creator-platforms-search">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по площадкам и возможностям" />
        </label>
        <div className="creator-platforms-segments" role="group" aria-label="Тип площадки">
          {CREATOR_PLATFORM_CATEGORIES.map((item) => (
            <button key={item.id} type="button" className={category === item.id ? "is-active" : ""} onClick={() => setCategory(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="creator-platforms-selects">
          <label><span>География</span><select value={geo} onChange={(event) => setGeo(event.target.value)}>{CREATOR_PLATFORM_GEOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label><span>Приоритет</span><select value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </section>

      <section className="analytics-surface creator-platforms-table-card">
        <div className="creator-platforms-table-head">
          <div><span>Каталог</span><h2>Площадки для проверки</h2></div>
          <strong>{filteredPlatforms.length} из {CREATOR_PLATFORMS.length}</strong>
        </div>
        <div className="creator-platforms-table-wrap">
          <table>
            <thead><tr><th>Приоритет</th><th>Площадка</th><th>Тип и география</th><th>Стоимость</th><th>Задача для Atlas</th><th>Статус</th><th><span className="sr-only">Сайт</span></th></tr></thead>
            <tbody>
              {filteredPlatforms.map((platform) => (
                <tr key={platform.id}>
                  <td><span className={`creator-platforms-priority is-${platform.priority.toLowerCase()}`}>{platform.priority}</span></td>
                  <td><strong>{platform.name}</strong><small>{platform.atlasFit}</small></td>
                  <td><strong>{platform.categoryLabel}</strong><small>{platform.geoLabel}</small></td>
                  <td><strong>{platform.price}</strong><small>{platform.priceNote}</small></td>
                  <td>{platform.useCase}</td>
                  <td><span className="creator-platforms-status">Нужен pre-approval</span></td>
                  <td><a className="creator-platforms-open" href={platform.url} target="_blank" rel="noreferrer" aria-label={`Открыть ${platform.name}`} title={`Открыть ${platform.name}`}><ExternalLink size={17} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredPlatforms.length ? <div className="creator-platforms-empty">По выбранным фильтрам площадок не найдено.</div> : null}
        </div>
      </section>

      <section className="analytics-surface creator-platforms-checklist">
        <div><span className="creator-platforms-eyebrow">Контроль риска</span><h2>Проверка перед оплатой</h2><p>Ответы фиксируются письменно. Публичный тариф является ориентиром и проверяется повторно перед покупкой.</p></div>
        <ol>{CREATOR_PLATFORM_CHECKLIST.map((item, index) => <li key={item}><span>{index + 1}</span><p>{item}</p></li>)}</ol>
      </section>
    </div>
  );
}
