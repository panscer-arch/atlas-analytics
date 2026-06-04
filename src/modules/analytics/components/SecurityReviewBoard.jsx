const documentCards = [
  {
    title: "Security Review V1",
    type: "Документ",
    status: "Готов к вычитке",
    description: "Рабочий документ: взломоустойчивость, owner-полномочия, Transport, LP-риски и план проверки.",
    href: "/security/atlas-security-review-v1-ru.md",
    cta: "Открыть документ",
  },
  {
    title: "Public Security Text",
    type: "Публичный текст",
    status: "Для сайта / FAQ",
    description: "Безопасные формулировки без слов Audited, 100% secure, guaranteed и других опасных обещаний.",
    href: "/security/public-security-text-ru.md",
    cta: "Открыть текст",
  },
  {
    title: "Slither Report",
    type: "Auto-analysis",
    status: "Запущен",
    description: "Машинный отчет Solidity-анализатора. Нужен security-специалисту для ручной фильтрации сигналов.",
    href: "/security/slither-report.json",
    cta: "Скачать JSON",
  },
  {
    title: "Solhint Report",
    type: "Code quality",
    status: "Запущен",
    description: "Предупреждения по стилю, NatSpec, imports, compiler-version и технической гигиене Solidity-кода.",
    href: "/security/solhint-report.txt",
    cta: "Открыть отчет",
  },
  {
    title: "Mythril Transport",
    type: "Bytecode check",
    status: "Частично пройден",
    description: "Ограниченный прогон Transport bytecode: success=true, issues=0. Не заменяет полный аудит.",
    href: "/security/mythril-transport.json",
    cta: "Открыть результат",
  },
  {
    title: "Review Index",
    type: "Навигация",
    status: "Для команды",
    description: "Короткий индекс: какой файл зачем нужен и что уже можно показывать внутри команды.",
    href: "/security/security-review-index-ru.md",
    cta: "Открыть индекс",
  },
];

const verificationSteps = [
  {
    title: "1. Открыть рабочий review",
    text: "Начать с Security Review V1: там видно, какие риски относятся к внешнему взлому, а какие к архитектуре управления.",
  },
  {
    title: "2. Сверить автоотчеты",
    text: "Slither и Solhint показывают сигналы, но их нельзя публиковать как вывод без ручной фильтрации security-специалистом.",
  },
  {
    title: "3. Проверить claim-сценарии",
    text: "Главные тесты: чужой claim, двойной claim, превышение разрешенной суммы, owner-only Transport и корректность учета выплат.",
  },
  {
    title: "4. Зафиксировать публичный статус",
    text: "Пока писать только Security Review in progress. Статус Audited можно использовать только после внешнего аудита.",
  },
];

const reviewRoles = [
  {
    role: "Project Lead",
    verdict: "Собрать процесс в понятную дорожную карту.",
    note: "Страница должна отвечать на вопрос: что уже сделано, что проверяется сейчас, какие документы есть и какой следующий шаг.",
    action: "Оставить visible-статусы: готово, в работе, следующий этап.",
  },
  {
    role: "Security Expert",
    verdict: "Разделить внешний взлом и owner-полномочия.",
    note: "Для пользователя это разные риски: один относится к коду, второй к архитектуре управления. В интерфейсе они должны идти отдельно.",
    action: "Добавить invariant/fuzzing как обязательный следующий слой.",
  },
  {
    role: "Content",
    verdict: "Сделать понятным для новичка.",
    note: "Сначала человеческий смысл: проверяем, может ли посторонний вмешаться, и какие полномочия есть у владельца. Термины объяснять ниже.",
    action: "В публичных блоках избегать слов, которые звучат как гарантия.",
  },
  {
    role: "Legal",
    verdict: "Не обещать безопасность и доходность.",
    note: "Корректная позиция: процесс проверки запущен, отчеты доступны, часть этапов еще в работе. Не писать guarantee, risk-free, audited.",
    action: "Отдельно закрепить дисклеймер для сайта и презентаций.",
  },
  {
    role: "Marketing",
    verdict: "Превратить security в доверие, а не страх.",
    note: "Показываем зрелость: мы не прячем риски, а раскладываем их по полкам и фиксируем процесс проверки.",
    action: "Для сайта сделать короткий блок и кнопку Подробнее.",
  },
  {
    role: "Design",
    verdict: "Дать пользователю понятные действия.",
    note: "Не только текстовые карточки: нужны кнопки, документы, статусы, прогресс и путь проверки.",
    action: "Документы вывести сразу после hero, до технических деталей.",
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

      <div className="analytics-security-section">
        <div className="analytics-security-section-head">
          <span>00</span>
          <h3>Документы и отчеты</h3>
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
          <h3>Как проверить, что работа по безопасности реально идет</h3>
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
