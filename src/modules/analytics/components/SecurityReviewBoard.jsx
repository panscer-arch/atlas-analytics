const securityChecks = [
  ["Access Control", "Claim чужого ордера должен быть невозможен. Owner-функции отдельно раскрываются как архитектурные полномочия.", "В ручном review прямой публичный claim чужого ордера не выявлен."],
  ["Reentrancy", "Пользовательские lockup/claim используют nonReentrant. Transport нужно привести к такому же стандарту.", "Добавить nonReentrant в Transport.claimReferral."],
  ["Claim Logic", "Проверить, что пользователь не может вывести больше расчетной суммы по своему ордеру.", "Нужны Foundry invariant tests и fuzzing."],
  ["Transport Logic", "Referral-claim вызывается owner-адресом, а не произвольным пользователем.", "Публично описать как административный модуль исполнения."],
  ["LP / Pancake V3", "Вывод зависит от LP-position, tick, liquidity и collect/decreaseLiquidity.", "Нужны slippage/min-output правила и мониторинг позиции."],
  ["Owner Powers", "Treasury, fee и tokenId меняются owner-функциями.", "Рекомендуется multisig/timelock и события изменений."],
];

const publicTexts = [
  {
    title: "Короткая публичная формулировка",
    text: "Atlas System отдельно проверяет безопасность кода и отдельно раскрывает архитектурные полномочия системы. Пользовательские claim-операции защищены проверкой владельца ордера, а ключевые пользовательские функции используют reentrancy-защиту.",
  },
  {
    title: "Для FAQ",
    text: "Посторонний адрес не должен иметь возможность вызвать claim по чужому ордеру. Эта логика проверяется через access-control review, fuzzing, инвариантные тесты и тестнет-испытание.",
  },
  {
    title: "Про owner-полномочия",
    text: "В системе есть административные функции и Transport-модуль. Это не внешний взлом, а управленческий риск, который должен быть описан отдельно и понятен участникам заранее.",
  },
];

const forbiddenTexts = [
  "Audited",
  "100% secure",
  "Impossible to hack",
  "Funds are guaranteed",
  "Guaranteed profit",
  "Risk-free participation",
];

const nextSteps = [
  "Установить и прогнать Slither, Solhint, Aderyn/Mythril по финальной версии контрактов.",
  "Подготовить Foundry-проект и invariant-тесты для UnityLockup, UnityDaily, Transport.",
  "Проверить сценарии: 1000 пользователей, 50000 lockup, 100000 claim, random суммы и сроки.",
  "Запустить BNB Testnet battle test на 100-200 человек с bounty за воспроизводимый exploit.",
  "Собрать публичный Security Review без слова Audited и отдельный документ owner-полномочий.",
];

const toolResults = [
  ["Slither", "Запущен", "265 findings: большая часть шум по OZ/Pancake, важные сигналы — Transport reentrancy-events, uninitialized positionRewards, ignored return values, compiler warnings."],
  ["Solhint", "Запущен", "371 warning/error: стиль, NatSpec, compiler-version, глобальные imports, gas-предупреждения. Нужна фильтрация внешних интерфейсов Pancake."],
  ["Foundry build", "Пройден", "29 файлов собраны через solc 0.8.20, via_ir=true. Предупреждения: UnityDaily divide-before-multiply, UnityLockup block.timestamp."],
  ["Mythril", "Пройден частично", "Transport проверен по bytecode в 60-секундном bounded run: success=true, issues=0. Для остальных контрактов нужен отдельный прогон."],
  ["Invariant tests", "Следующий этап", "Нужно написать тесты на чужой claim, двойной claim, лимит Daily 200 периодов, owner-only Transport и корректный учет выплат."],
];

function SecurityReviewBoard() {
  return (
    <section className="analytics-surface analytics-security-review">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Security Review</span>
          <h2 className="analytics-agent-template-title">Безопасность smart-contract Atlas</h2>
          <p className="analytics-page-subtitle">
            Рабочая вкладка для проверки взломоустойчивости, owner-полномочий, Transport-логики, LP-рисков и публичных формулировок. Не внешний аудит и не статус Audited.
          </p>
        </div>
      </div>

      <div className="analytics-security-hero-grid">
        <article className="analytics-security-hero-card">
          <span>Вопрос 1</span>
          <h3>Может ли посторонний украсть деньги?</h3>
          <p>Это проверка кода: access control, claim logic, reentrancy, арифметика, DoS, внешние вызовы и fuzzing.</p>
        </article>
        <article className="analytics-security-hero-card">
          <span>Вопрос 2</span>
          <h3>Какие полномочия есть у владельца?</h3>
          <p>Это архитектурный риск: Transport, treasury, fee, tokenId, LP-position, multisig/timelock и публичное раскрытие.</p>
        </article>
      </div>

      <div className="analytics-security-section">
        <h3>Проверяемые блоки</h3>
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
        <h3>Авто-инструменты</h3>
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
        <h3>Публичные формулировки</h3>
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
          <h3>Нельзя писать</h3>
          <div className="analytics-security-tags">
            {forbiddenTexts.map((text) => <span key={text}>{text}</span>)}
          </div>
        </div>
        <div>
          <h3>Следующие шаги</h3>
          <ol className="analytics-security-steps">
            {nextSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default SecurityReviewBoard;
