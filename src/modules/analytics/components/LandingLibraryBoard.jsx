import { useState } from "react";
import "./LandingLibraryBoard.css";

const LANDING_PATH = "/landings/atlas-email-intro/";

function getLandingUrl() {
  if (typeof window === "undefined") return LANDING_PATH;
  return new URL(LANDING_PATH, window.location.origin).toString();
}

export default function LandingLibraryBoard() {
  const [copyState, setCopyState] = useState("idle");
  const landingUrl = getLandingUrl();

  async function copyLandingUrl() {
    try {
      await navigator.clipboard.writeText(landingUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="analytics-landings-board">
      <article className="analytics-surface analytics-landing-card">
        <a className="analytics-landing-card-preview" href={LANDING_PATH} target="_blank" rel="noreferrer">
          <img src={`${LANDING_PATH}preview.png`} alt="Превью лендинга Atlas для email-трафика" />
          <span>Открыть полный лендинг</span>
        </a>

        <div className="analytics-landing-card-body">
          <div className="analytics-landing-card-title-row">
            <div>
              <p className="analytics-kicker">Email / Web3</p>
              <h3>Atlas: знакомство и независимая проверка</h3>
            </div>
            <span className="analytics-landing-status">Готов</span>
          </div>

          <p className="analytics-landing-description">
            Короткий путь для криптоопытной аудитории: механика Smart Cycle, пример расчёта, аудит, документы,
            риски и переход на официальный сайт Atlas.
          </p>

          <dl className="analytics-landing-meta">
            <div><dt>Аудитория</dt><dd>Web3 / dApp</dd></div>
            <div><dt>Источник</dt><dd>Email-кампании</dd></div>
            <div><dt>Язык</dt><dd>Русский</dd></div>
            <div><dt>Формат</dt><dd>6 экранов</dd></div>
          </dl>

          <div className="analytics-landing-actions">
            <a className="analytics-landing-open" href={LANDING_PATH} target="_blank" rel="noreferrer">Открыть лендинг ↗</a>
            <button type="button" className="analytics-landing-copy" onClick={copyLandingUrl}>
              {copyState === "copied" ? "Ссылка скопирована" : copyState === "error" ? "Не удалось скопировать" : "Копировать ссылку"}
            </button>
          </div>

          <p className="analytics-landing-url">{landingUrl}</p>
        </div>
      </article>

      <section className="analytics-surface analytics-landing-live-preview">
        <div className="analytics-landing-live-head">
          <div><p className="analytics-kicker">Live preview</p><h3>Предпросмотр опубликованной страницы</h3></div>
          <a href={LANDING_PATH} target="_blank" rel="noreferrer">Новая вкладка ↗</a>
        </div>
        <div className="analytics-landing-browser">
          <div className="analytics-landing-browser-bar"><i /><i /><i /><span>{landingUrl}</span></div>
          <iframe title="Предпросмотр лендинга Atlas" src={LANDING_PATH} loading="lazy" />
        </div>
      </section>
    </div>
  );
}
