import { useMemo, useState } from "react";
import "./LandingContentBoard.css";
import {
  LANDING_SOURCE_URL,
  landingAuditNotes,
  landingCycleExamples,
  landingFaq,
  landingSections,
  landingStats,
} from "../data/landingContentData";

const LANDINGS = [
  {
    id: "landing-1",
    title: "Лендинг 1",
    subtitle: "Главная продающая страница Atlas System",
    status: "Вычитано",
  },
];

function buildLandingCopy() {
  const sections = landingSections.map((section) => `## ${section.title}\n${section.text}`).join("\n\n");
  const cycles = landingCycleExamples
    .map((cycle) => `- ${cycle.name}: ${cycle.term}, ${cycle.delta}, пример ${cycle.amount} -> ${cycle.claim}`)
    .join("\n");
  const faq = landingFaq.map((item) => `### ${item.question}\n${item.answer}`).join("\n\n");

  return `# Atlas System — платформа цифровой взаимопомощи нового поколения

${sections}

## Примеры Smart Cycle
${cycles}

## Частые вопросы
${faq}`;
}

function LandingContentBoard() {
  const [activeLandingId, setActiveLandingId] = useState(LANDINGS[0].id);
  const [copyState, setCopyState] = useState("idle");
  const activeLanding = LANDINGS.find((landing) => landing.id === activeLandingId) || LANDINGS[0];
  const landingCopy = useMemo(buildLandingCopy, []);

  async function copyLandingText() {
    try {
      await navigator.clipboard.writeText(landingCopy);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="analytics-landings">
      <div className="analytics-landings-hero">
        <div>
          <span className="analytics-kicker">SuperSUS Content / лендинги</span>
          <h2>Лендинги Atlas</h2>
          <p>
            Рабочая витрина для вычитки и сборки посадочных страниц. «Лендинг 1» пересобран из Google Doc,
            сверстан в стиле Atlas и очищен от рискованных обещаний.
          </p>
        </div>
        <div className="analytics-landings-actions">
          <a href={LANDING_SOURCE_URL} target="_blank" rel="noreferrer">Открыть Google Doc</a>
          <button type="button" onClick={copyLandingText}>
            {copyState === "copied" ? "Скопировано" : "Скопировать текст"}
          </button>
        </div>
      </div>

      <div className="analytics-landings-layout">
        <aside className="analytics-landings-sidebar" aria-label="Список лендингов">
          {LANDINGS.map((landing) => (
            <button
              key={landing.id}
              type="button"
              className={landing.id === activeLandingId ? "is-active" : ""}
              onClick={() => setActiveLandingId(landing.id)}
            >
              <span>{landing.status}</span>
              <strong>{landing.title}</strong>
              <small>{landing.subtitle}</small>
            </button>
          ))}
        </aside>

        <div className="analytics-landings-main">
          <section className="analytics-landings-status">
            <article>
              <span>Источник</span>
              <strong>Google Doc</strong>
              <p>Текст выгружен из документа и вычитан под актуальную механику Atlas.</p>
            </article>
            <article>
              <span>Актуализация</span>
              <strong>18.06.2026</strong>
              <p>Сверено с atlas-system.io, White Paper и локальным Atlas dataset.</p>
            </article>
            <article>
              <span>Формулировки</span>
              <strong>Risk-safe</strong>
              <p>Убраны обещания дохода; добавлены условия ликвидности и дисклеймер.</p>
            </article>
            <article>
              <span>Статус</span>
              <strong>{activeLanding.status}</strong>
              <p>Готово для следующего этапа: дизайн-макет, HTML или перенос на сайт.</p>
            </article>
          </section>

          <section className="analytics-landings-audit">
            <div>
              <span className="analytics-kicker">Редактура</span>
              <h3>Что поправлено перед версткой</h3>
            </div>
            <div className="analytics-landings-audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Блок</th>
                    <th>Было</th>
                    <th>Стало</th>
                    <th>Почему</th>
                  </tr>
                </thead>
                <tbody>
                  {landingAuditNotes.map((note) => (
                    <tr key={note.area}>
                      <td>{note.area}</td>
                      <td>{note.before}</td>
                      <td>{note.after}</td>
                      <td>{note.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <article className="analytics-landings-preview">
            <section className="analytics-landings-preview-hero">
              <div>
                <span>Web3 • Smart Contracts • DAO mechanics • MLM</span>
                <h1>Atlas System — платформа цифровой взаимопомощи нового поколения</h1>
                <p>
                  Создавайте Smart Cycle, отслеживайте операции в личном кабинете и принимайте решения на основе
                  открытых правил, on-chain данных и понятной экономической механики.
                </p>
                <div className="analytics-landings-preview-buttons">
                  <a href="https://atlas-system.io/" target="_blank" rel="noreferrer">Начать участие</a>
                  <a href="https://atlas-system.io/wp-content/uploads/2026/06/atlas_manifesto.pdf" target="_blank" rel="noreferrer">Изучить манифест</a>
                </div>
                <small>
                  Atlas не гарантирует возврат помощи, расчетную дельту или финансовый результат. Участие является добровольным.
                </small>
              </div>
              <div className="analytics-landings-product-card" aria-label="Smart Cycle interface preview">
                <div className="analytics-landings-card-head">
                  <b>Smart Cycle 1</b>
                  <span>BNB Smart Chain</span>
                </div>
                <div className="analytics-landings-cycle-ring">
                  <strong>+22.5%</strong>
                  <span>30 дней / расчетная дельта</span>
                </div>
                <div className="analytics-landings-mini-grid">
                  <span>USDT BEP20</span>
                  <span>min 10 USDT</span>
                  <span>Claim</span>
                  <span>on-chain</span>
                </div>
              </div>
            </section>

            <section className="analytics-landings-pillars">
              {landingSections.slice(1, 4).map((section) => (
                <div key={section.id}>
                  <span>{section.label}</span>
                  <strong>{section.title}</strong>
                  <p>{section.text}</p>
                </div>
              ))}
            </section>

            <section className="analytics-landings-flow">
              <div>
                <span className="analytics-kicker">Механика</span>
                <h3>Как работает Atlas System</h3>
              </div>
              {[
                "Вы выбираете Smart Cycle и сумму участия.",
                "Средства попадают в смарт-контракт и участвуют в цикле взаимной помощи.",
                "После завершения срока можно подать Claim.",
                "Исполнение Claim зависит от правил, очереди, состояния системы и доступной ликвидности.",
              ].map((step, index) => (
                <div className="analytics-landings-flow-step" key={step}>
                  <b>{index + 1}</b>
                  <p>{step}</p>
                </div>
              ))}
            </section>

            <section className="analytics-landings-cycles">
              <div>
                <span className="analytics-kicker">Smart Cycle examples</span>
                <h3>Примеры расчетной дельты</h3>
                <p>Примеры показывают расчетный сценарий, а не гарантированный доход или обязательство компании.</p>
              </div>
              <div className="analytics-landings-cycle-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Формат</th>
                      <th>Срок</th>
                      <th>Расчетная дельта</th>
                      <th>Пример суммы</th>
                      <th>Расчетный Claim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {landingCycleExamples.map((cycle) => (
                      <tr key={cycle.name}>
                        <td>{cycle.name}</td>
                        <td>{cycle.term}</td>
                        <td>{cycle.delta}</td>
                        <td>{cycle.amount}</td>
                        <td>{cycle.claim}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="analytics-landings-dashboard">
              <div>
                <span className="analytics-kicker">Личный кабинет</span>
                <h3>Что должен видеть участник</h3>
                <p>Кабинет должен объяснять не обещания, а фактическое состояние участия: циклы, Claim, историю и статистику.</p>
              </div>
              <div className="analytics-landings-stat-grid">
                {landingStats.map((stat) => <span key={stat}>{stat}</span>)}
              </div>
            </section>

            <section className="analytics-landings-partner">
              <div>
                <span className="analytics-kicker">Invite & Earn</span>
                <h3>Партнерская программа</h3>
                <p>
                  Участники могут приглашать людей, строить структуру и получать партнерские вознаграждения от полученной
                  расчетной дельты нижестоящих участников. Модель строится на статусах, квалификациях, командной активности
                  и правилах компрессии.
                </p>
              </div>
              <div className="analytics-landings-partner-metrics">
                <strong>15-60%</strong>
                <span>диапазон партнерской модели по статусам</span>
              </div>
            </section>

            <section className="analytics-landings-risk">
              <strong>Важное предупреждение</strong>
              <p>{landingSections.find((section) => section.id === "risk")?.text}</p>
            </section>

            <section className="analytics-landings-faq">
              <div>
                <span className="analytics-kicker">FAQ</span>
                <h3>Частые вопросы</h3>
              </div>
              {landingFaq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>

            <section className="analytics-landings-final">
              <h3>Atlas System — изучайте правила, проверяйте данные, принимайте собственное решение.</h3>
              <a href="https://atlas-system.io/" target="_blank" rel="noreferrer">Перейти к Atlas System</a>
            </section>
          </article>
        </div>
      </div>
    </section>
  );
}

export default LandingContentBoard;
