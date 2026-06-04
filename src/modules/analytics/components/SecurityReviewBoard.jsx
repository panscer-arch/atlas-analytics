const reviewRoles = [
  {
    role: "Project",
    verdict: "Сделать страницу доверия, а не страницу обещаний.",
    note: "Показываем процесс проверки, статус этапов и следующие действия. Не используем формулировки, которые выглядят как завершенный аудит.",
  },
  {
    role: "Security",
    verdict: "Разделить внешний взлом и owner-полномочия.",
    note: "Для пользователя это разные риски: один относится к коду, второй к архитектуре управления. В интерфейсе они должны идти отдельно.",
  },
  {
    role: "Marketing",
    verdict: "Говорить просто и уверенно, без перегруза терминами.",
    note: "Сначала объясняем: что проверяется и зачем. Технические инструменты показываем как подтверждение процесса, а не как главный текст.",
  },
  {
    role: "Design",
    verdict: "Сделать блок похожим на публичный trust-center.",
    note: "Больше воздуха, статусы, акценты, карточки, четкая иерархия. Меньше ощущения внутренней таблицы для разработчиков.",
  },
];

const securityChecks = [
  ["Access Control", "Проверяем, что посторонний адрес не может вызвать claim по чужому ордеру или выполнить owner-действия.", "Первичный review"],
  ["Reentrancy", "Проверяем повторные вызовы и сценарии, где внешний контракт пытается вмешаться в выполнение операции.", "В работе"],
  ["Claim Logic", "Проверяем, что пользователь не может запросить больше суммы, разрешенной правилами выбранного цикла.", "Нужны инварианты"],
  ["Transport Logic", "Отдельно описываем административный модуль исполнения и границы его полномочий.", "Раскрыть публично"],
  ["LP / Pancake V3", "Проверяем зависимость выплат от LP-position, ликвидности, tick-диапазона и правил вывода.", "Нужен stress-test"],
  ["Owner Powers", "Фиксируем, какие параметры может менять владелец, и какие меры контроля нужны: multisig, timelock, события.", "Risk disclosure"],
];

const publicTexts = [
  {
    title: "Для главной страницы",
    text: "Atlas System проходит многоэтапную проверку безопасности: автоматический анализ, ручной review, инвариантные тесты, fuzzing и тестирование в testnet. Мы отдельно показываем безопасность кода и отдельно раскрываем архитектурные полномочия системы.",
  },
  {
    title: "Для FAQ",
    text: "Мы не называем систему абсолютно безрисковой. Вместо этого показываем, какие проверки уже запущены, какие зоны риска изучаются и какие дополнительные этапы должны быть завершены перед публичным статусом Security Review.",
  },
  {
    title: "Для лидеров и партнеров",
    text: "Безопасность Atlas объясняется честно: внешний взлом, логика claim, ликвидность и административные полномочия рассматриваются отдельно. Это помогает не смешивать техническую защиту контракта и управленческие риски.",
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
  "Прогнать Aderyn/Mythril по финальной версии всех контрактов и сохранить отчеты.",
  "Подготовить Foundry invariant-тесты для UnityLockup, UnityDaily и Transport.",
  "Проверить сценарии: 1000 пользователей, 50000 lockup, 100000 claim, случайные суммы и сроки.",
  "Запустить BNB Testnet battle test на 100-200 человек с bounty за воспроизводимый exploit.",
  "Собрать публичный Security Review и отдельный документ по owner-полномочиям.",
];

const toolResults = [
  ["Slither", "Запущен", "Автоматический анализ выявил зоны для ручной проверки: Transport-события, return values, compiler warnings и места, где нужен явный контроль логики."],
  ["Solhint", "Запущен", "Проверка качества Solidity-кода: стиль, NatSpec, версии компилятора, imports и gas-предупреждения. Отдельно фильтруются внешние библиотеки."],
  ["Foundry build", "Пройден", "Проект собирается через solc 0.8.20 с via_ir=true. Предупреждения вынесены в технический review."],
  ["Mythril", "Пройден частично", "Transport проверен по bytecode в ограниченном прогоне: success=true, issues=0. Остальные контракты идут следующим этапом."],
  ["Invariant tests", "Следующий этап", "Нужны тесты на чужой claim, двойной claim, лимит Daily, owner-only Transport и корректный учет выплат."],
];

function SecurityReviewBoard() {
  return (
    <section className="analytics-surface analytics-security-review">
      <div className="analytics-security-hero">
        <div className="analytics-security-hero-copy">
          <span className="analytics-kicker">Security Review in progress</span>
          <h2>Безопасность Atlas System уже запущена в работу</h2>
          <p>
            Мы собираем доказательную базу по смарт-контрактам: автоматический анализ, ручная вычитка,
            проверка claim-логики, owner-полномочий, Transport-модуля, LP-рисков и будущих testnet-сценариев.
          </p>
          <div className="analytics-security-status-row">
            <span>Не аудит</span>
            <span>Не гарантия дохода</span>
            <span>Публичный процесс проверки</span>
          </div>
        </div>
        <div className="analytics-security-score-card" aria-label="Статус проверки">
          <div className="analytics-security-score-top">
            <span>Current Status</span>
            <small>V1</small>
          </div>
          <strong>Review started</strong>
          <p>Собраны первые автоотчеты и карта рисков. Следующий этап — invariant tests, fuzzing и testnet battle test.</p>
          <div className="analytics-security-progress-list" aria-label="Этапы проверки">
            <em>Auto tools</em>
            <em>Manual review</em>
            <em>Invariant tests</em>
            <em>Testnet battle</em>
          </div>
        </div>
      </div>

      <div className="analytics-security-role-grid">
        {reviewRoles.map((item) => (
          <article key={item.role} className="analytics-security-role-card">
            <span>{item.role}</span>
            <h3>{item.verdict}</h3>
            <p>{item.note}</p>
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
          <span>01</span>
          <h3>Что именно проверяем</h3>
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
          <span>02</span>
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
          <span>03</span>
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
            <span>04</span>
            <h3>Нельзя писать</h3>
          </div>
          <div className="analytics-security-tags">
            {forbiddenTexts.map((text) => <span key={text}>{text}</span>)}
          </div>
        </div>
        <div>
          <div className="analytics-security-section-head">
            <span>05</span>
            <h3>Следующие шаги</h3>
          </div>
          <ol className="analytics-security-steps">
            {nextSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default SecurityReviewBoard;
