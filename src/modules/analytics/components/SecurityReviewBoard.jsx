import { useState } from "react";
import AuditorCompaniesBoard from "./AuditorCompaniesBoard";
import TransportRiskFaqBoard from "./TransportRiskFaqBoard";

import {
  auditRiskBridge,
  completionItems,
  documentCards,
  executiveVerdict,
  externalTrustGaps,
  forbiddenTexts,
  launchGates,
  priorityActions,
  programEvidence,
  publicTexts,
  reviewRoles,
  safetyClaims,
  securityChecks,
  toolResults,
  trustLadder,
  verificationSteps,
} from "../data/securityReviewData";

function SecurityReviewBoard() {
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === "undefined") return "review";
    const url = new URL(window.location.href);
    return url.searchParams.get("board") === "transportRiskFaq" ? "auditRisk" : "review";
  });

  return (
    <section className="analytics-surface analytics-security-review">
      <div className="analytics-security-hero">
        <div className="analytics-security-hero-copy">
          <span className="analytics-kicker">Code Safety Review</span>
          <h2>Как мы показываем, что код Atlas проверяется на безопасность</h2>
          <p>
            Простая версия: мы не просим верить словам. Мы показываем, какие защитные механизмы есть в коде,
            какие отчеты уже собраны, какие риски раскрываются отдельно и какие проверки еще нужно завершить.
          </p>
          <div className="analytics-security-status-row">
            <span>Чужой claim проверяется</span>
            <span>Owner-полномочия отдельно</span>
            <span>Не внешний аудит</span>
          </div>
          <div className="analytics-security-hero-actions">
            <a href="/security/atlas-security-review-v1-ru.md" target="_blank" rel="noreferrer">Открыть Security Review</a>
            <a href="/security/security-review-index-ru.md" target="_blank" rel="noreferrer">Индекс документов</a>
          </div>
        </div>
        <div className="analytics-security-score-card" aria-label="Статус проверки">
          <div className="analytics-security-score-top">
            <span>Current Status</span>
            <small>V1</small>
          </div>
          <strong>Code review in progress</strong>
          <p>Базовые защитные механизмы найдены, описаны и частично подтверждены Foundry-тестами. Testnet Battle Kit подготовлен; полный публичный статус появится после реального challenge и итогового отчета.</p>
          <div className="analytics-security-progress-list" aria-label="Этапы проверки">
            <em>Manual code review</em>
            <em>Auto-analysis reports</em>
            <em>Invariant tests</em>
            <em>External audit</em>
          </div>
        </div>
      </div>

      <div className="analytics-security-view-tabs" role="tablist" aria-label="Подвкладки Security Review">
        <button
          className={activeView === "review" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveView("review")}
        >
          Security Review
        </button>
        <button
          className={activeView === "auditors" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveView("auditors")}
        >
          Список компаний
        </button>
        <button
          className={activeView === "auditRisk" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveView("auditRisk")}
        >
          Аудит риск
        </button>
      </div>

      {activeView === "auditors" ? (
        <AuditorCompaniesBoard />
      ) : activeView === "auditRisk" ? (
        <TransportRiskFaqBoard />
      ) : (
        <>

      <div className="analytics-security-section analytics-security-answer">
        <div className="analytics-security-answer-main">
          <span className="analytics-kicker">Главный ответ</span>
          <h3>Пока корректно говорить так: код имеет базовые защитные механизмы и проходит Security Review.</h3>
          <p>
            Это сильнее, чем просто “мы безопасные”, потому что показывает конкретику: проверка владельца ордера,
            защита от повторного входа, безопасные ERC20-операции, owner-only ограничения, Foundry-тесты и опубликованные отчеты.
            Но это еще не статус Audited.
          </p>
        </div>
        <div className="analytics-security-answer-side">
          <strong>Формула для сайта</strong>
          <p>Код Atlas проходит поэтапную проверку безопасности. Уже проверяются права доступа, claim-логика, reentrancy-защита и owner-полномочия. Отчеты доступны, следующие тесты опубликованы.</p>
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>00</span>
          <h3>Финальный executive verdict</h3>
        </div>
        <div className="analytics-security-verdict-grid">
          {executiveVerdict.map((item) => (
            <article key={item.label} className={`analytics-security-verdict-card analytics-security-verdict-${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>01</span>
          <h3>Launch gate matrix</h3>
        </div>
        <div className="analytics-security-gate-table" role="table" aria-label="Launch gate matrix">
          <div className="analytics-security-gate-row analytics-security-gate-head" role="row">
            <span>Gate</span>
            <span>Статус</span>
            <span>Что есть сейчас</span>
            <span>Что нужно закрыть</span>
          </div>
          {launchGates.map(([gate, status, evidence, next]) => (
            <div key={gate} className="analytics-security-gate-row" role="row">
              <strong>{gate}</strong>
              <span>{status}</span>
              <p>{evidence}</p>
              <p>{next}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>02</span>
          <h3>Что выдала программа и как это читать</h3>
        </div>
        <div className="analytics-security-program-grid">
          {programEvidence.map((item) => (
            <article key={item.program} className="analytics-security-program-card">
              <div className="analytics-security-program-head">
                <div>
                  <span>Программа</span>
                  <h4>{item.program}</h4>
                </div>
                <small>{item.status}</small>
              </div>
              <div className="analytics-security-program-command">
                <strong>Как повторить проверку</strong>
                <code>{item.command}</code>
              </div>
              <div className="analytics-security-program-output">
                <strong>Что выдала программа</strong>
                <p>{item.output}</p>
              </div>
              <div className="analytics-security-program-human">
                <strong>Перевод на человеческий язык</strong>
                <p>{item.human}</p>
              </div>
              <a href={item.report} target="_blank" rel="noreferrer">Открыть отчет</a>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>03</span>
          <h3>Перевод кода на обычный язык</h3>
        </div>
        <div className="analytics-security-claim-grid">
          {safetyClaims.map((item) => (
            <article key={item.title} className={`analytics-security-claim-card analytics-security-claim-${item.level}`}>
              <div className="analytics-security-doc-top">
                <span>{item.status}</span>
                <small>{item.level === "strong" ? "есть основание" : item.level === "caution" ? "раскрыть риск" : "доказать тестами"}</small>
              </div>
              <h4>{item.title}</h4>
              <p>{item.plain}</p>
              <div>{item.proof}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-trust-ladder">
        {trustLadder.map(([title, text]) => (
          <article key={title}>
            <h4>{title}</h4>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>04</span>
          <h3>Что нужно добавить для полного внешнего доверия</h3>
        </div>
        <div className="analytics-security-gap-grid">
          {externalTrustGaps.map((item) => (
            <article key={item.title} className="analytics-security-gap-card">
              <div className="analytics-security-doc-top">
                <span>{item.status}</span>
                <small>external check</small>
              </div>
              <h4>{item.title}</h4>
              <p>{item.why}</p>
              <div>
                <strong>Следующий шаг</strong>
                <span>{item.next}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>05</span>
          <h3>Документы и отчеты для проверки</h3>
        </div>
        <div className="analytics-security-doc-grid">
          {documentCards.map((item) => (
            <article key={item.title} className="analytics-security-doc-card">
              <div className="analytics-security-doc-top">
                <span>{item.type}</span>
                <small>{item.status}</small>
              </div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              <a href={item.href} target="_blank" rel="noreferrer">{item.cta}</a>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-verify-panel">
        <div>
          <span className="analytics-kicker">How to verify</span>
          <h3>Как человек может проверить это сам</h3>
          <p>
            Не просим верить на слово: открываются документы, отчеты авто-инструментов и список следующих тестов.
            Финальный публичный статус появится только после дополнительных проверок.
          </p>
        </div>
        <div className="analytics-security-verify-steps">
          {verificationSteps.map((item) => (
            <article key={item.title}>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-role-grid">
        {reviewRoles.map((item) => (
          <article key={item.role} className="analytics-security-role-card">
            <span>{item.role}</span>
            <h3>{item.verdict}</h3>
            <p>{item.note}</p>
            <small>{item.action}</small>
          </article>
        ))}
      </div>

      <div className="analytics-security-hero-grid">
        <article className="analytics-security-hero-card">
          <span>Вопрос 1</span>
          <h3>Может ли посторонний украсть деньги?</h3>
          <p>Это проверка кода: права доступа, claim-логика, reentrancy, арифметика, DoS, внешние вызовы и fuzzing.</p>
        </article>
        <article className="analytics-security-hero-card">
          <span>Вопрос 2</span>
          <h3>Какие полномочия есть у владельца?</h3>
          <p>Это архитектурный риск: Transport, treasury, fee, tokenId, LP-position, multisig/timelock и публичное раскрытие.</p>
        </article>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>06</span>
          <h3>Техническая карта проверки</h3>
        </div>
        <div className="analytics-security-check-grid">
          {securityChecks.map(([title, description, status]) => (
            <article key={title} className="analytics-security-check-card">
              <h4>{title}</h4>
              <p>{description}</p>
              <span>{status}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>07</span>
          <h3>Авто-инструменты</h3>
        </div>
        <div className="analytics-security-check-grid">
          {toolResults.map(([title, status, description]) => (
            <article key={title} className="analytics-security-check-card">
              <h4>{title}</h4>
              <p>{description}</p>
              <span>{status}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>08</span>
          <h3>Как говорить публично</h3>
        </div>
        <div className="analytics-security-public-grid">
          {publicTexts.map((item) => (
            <article key={item.title} className="analytics-security-public-card">
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section analytics-security-two-columns">
        <div>
          <div className="analytics-security-section-head">
            <span>09</span>
            <h3>Нельзя писать</h3>
          </div>
          <div className="analytics-security-tags">
            {forbiddenTexts.map((text) => <span key={text}>{text}</span>)}
          </div>
        </div>
        <div>
          <div className="analytics-security-section-head">
            <span>10</span>
            <h3>Что еще не завершено</h3>
          </div>
          <div className="analytics-security-completion-list">
            {completionItems.map((item) => (
              <article key={item.title}>
                <span>{item.status}</span>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>11</span>
          <h3>Приоритетный план закрытия Security Review</h3>
        </div>
        <div className="analytics-security-priority-list">
          {priorityActions.map((item) => (
            <article key={item.title}>
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section analytics-security-audit-bridge">
        <div>
          <span className="analytics-kicker">Связка с Audit Risk FAQ</span>
          <h3>Что показывать человеку, который увидит риск в аудите</h3>
          <p>
            Этот раздел не должен спорить с аудитом. Его задача — заранее объяснить, какие риски технические,
            какие архитектурные, какие уже проверены, а какие требуют доверия к системным полномочиям.
          </p>
          <button type="button" onClick={() => setActiveView("auditRisk")}>Открыть Audit Risk FAQ</button>
        </div>
        <div className="analytics-security-audit-list">
          {auditRiskBridge.map(([title, text]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
        </>
      )}
    </section>
  );
}

export default SecurityReviewBoard;
