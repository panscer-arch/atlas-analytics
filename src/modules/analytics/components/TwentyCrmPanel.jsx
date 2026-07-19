import { useEffect, useState } from "react";

const CRM_URL = "https://crm.supersussystem.com";

const INITIAL_STATUS = {
  service: "checking",
  publicAccess: false,
  dnsReady: false,
};

export default function TwentyCrmPanel() {
  const [status, setStatus] = useState(INITIAL_STATUS);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/content/crm-status", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setStatus(payload);
      })
      .catch(() => {
        if (!cancelled) setStatus({ ...INITIAL_STATUS, service: "unknown" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const serviceReady = status.service === "healthy";
  const publicReady = serviceReady && status.publicAccess;
  const stateLabel = publicReady
    ? "CRM работает"
    : serviceReady
      ? "Сервис запущен, подключаем адрес"
      : status.service === "checking"
        ? "Проверяем сервис"
        : "Сервис пока не запущен";

  return (
    <section className="analytics-twenty-crm">
      <header className="analytics-twenty-crm-head analytics-surface">
        <div>
          <p className="analytics-kicker">SuperSUS / CRM</p>
          <h2>Контакты, компании и сделки</h2>
          <p>Единая рабочая CRM для маркетинга, партнёров, площадок и переговоров.</p>
        </div>
        <div className={`analytics-twenty-crm-state is-${publicReady ? "ready" : serviceReady ? "pending" : "offline"}`}>
          <span aria-hidden="true" />
          {stateLabel}
        </div>
      </header>

      <div className="analytics-twenty-crm-grid">
        {[
          ["Люди", "Контакты лидеров, блогеров и представителей площадок"],
          ["Компании", "Мониторы, медиа, агентства и партнёрские организации"],
          ["Сделки", "Переговоры, цены, договорённости и следующий шаг"],
          ["Задачи", "Ответственные, сроки, звонки, письма и follow-up"],
        ].map(([title, description]) => (
          <article key={title} className="analytics-twenty-crm-card analytics-surface">
            <span>{title}</span>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <footer className="analytics-twenty-crm-launch analytics-surface">
        <div>
          <strong>{publicReady ? "Twenty CRM готова к работе" : "Twenty CRM установлена на сервере"}</strong>
          <p>
            {publicReady
              ? "Откройте CRM и создайте первый рабочий аккаунт. После этого новые регистрации автоматически закроются."
              : "Для внешнего входа нужна A-запись crm.supersussystem.com на сервер SuperSUS."}
          </p>
        </div>
        <a
          className={`analytics-export-btn${publicReady ? "" : " is-disabled"}`}
          href={publicReady ? CRM_URL : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!publicReady}
          onClick={(event) => {
            if (!publicReady) event.preventDefault();
          }}
        >
          Открыть CRM
        </a>
      </footer>
    </section>
  );
}
