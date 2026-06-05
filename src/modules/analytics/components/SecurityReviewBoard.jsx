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
    title: "Code Safety Summary",
    type: "Короткая версия",
    status: "Для сайта / лидеров",
    description: "Читаемая выжимка: что защищено в коде, что можно сказать сейчас и что еще нельзя обещать.",
    href: "/security/code-safety-summary-ru.md",
    cta: "Открыть summary",
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
    title: "1. Сначала смотрим кодовые защиты",
    text: "Есть ли проверка владельца ордера, защита от повторного claim, reentrancy-защита и безопасные ERC20-операции.",
  },
  {
    title: "2. Потом сверяем автоотчеты",
    text: "Slither, Solhint и Mythril не дают рекламный статус, но показывают, что код уже прогоняется через security-инструменты.",
  },
  {
    title: "3. Затем доказываем сценариями",
    text: "Главные тесты: чужой claim, двойной claim, превышение суммы, owner-only Transport и корректность учета выплат.",
  },
  {
    title: "4. Только потом даем публичный статус",
    text: "Пока корректно писать: Security Review in progress. Audited можно писать только после полноценного внешнего аудита.",
  },
];

const reviewRoles = [
  {
    role: "Project Lead",
    verdict: "Показываем не обещания, а проверяемые факты.",
    note: "Пользователь должен сразу увидеть: какие защиты уже есть в коде, какие отчеты доступны и что еще не завершено.",
    action: "Главный статус: базовая кодовая защита проверяется, полный аудит еще не заявляется.",
  },
  {
    role: "Security Expert",
    verdict: "Нельзя смешивать защиту кода и полномочия владельца.",
    note: "Код может иметь защиту от чужого claim, но при этом система может иметь owner-функции. Это разные типы риска.",
    action: "Показывать отдельно: external attack protection и owner powers disclosure.",
  },
  {
    role: "Content",
    verdict: "Писать как для человека без Web3-опыта.",
    note: "Не начинать с названий инструментов. Начать с вопроса: может ли чужой человек забрать не свое?",
    action: "Все термины объяснять через бытовой смысл: чей ордер, чей доступ, кто может вызвать действие.",
  },
  {
    role: "Legal",
    verdict: "Нельзя писать абсолютные гарантии.",
    note: "Корректная позиция: в коде есть защитные механизмы, проверка запущена, часть этапов еще в работе.",
    action: "Отдельно закрепить дисклеймер для сайта и презентаций.",
  },
  {
    role: "Marketing",
    verdict: "Доверие строится через прозрачность.",
    note: "Формулировка должна звучать уверенно: мы не прячем риски, а показываем, как они проверяются.",
    action: "Для сайта: Код проверяется. Отчеты доступны. Следующий этап опубликован.",
  },
  {
    role: "Design",
    verdict: "Сначала ответ, потом доказательства.",
    note: "Верх страницы должен отвечать на вопрос, ниже идут доказательства, затем документы и технические детали.",
    action: "Сделать блоки: что защищено, чем доказано, что еще не доказано.",
  },
];

const programEvidence = [
  {
    program: "Slither",
    status: "Отчет получен",
    report: "/security/slither-report.json",
    command: "slither . --solc-remaps @openzeppelin=node_modules/@openzeppelin --via-ir --optimize --json slither-report.json",
    output: "Программа выдала 265 findings. Основные сигналы для ручной проверки: Transport-события, return values, compiler warnings, LP/PositionHandler и отдельные места claim-логики.",
    human:
      "Это не означает, что код взломан. Это означает: автоматическая программа нашла места, которые security-специалист обязан проверить руками. Самое важное для обычного человека: чужой claim проверяется отдельно от owner-полномочий.",
  },
  {
    program: "Foundry build",
    status: "Сборка пройдена",
    report: "/security/code-safety-summary-ru.md",
    command: "forge build",
    output: "Проект собран через solc 0.8.20, via_ir=true. Контракты компилируются, критической ошибки сборки нет.",
    human:
      "Это базовая техническая проверка: код можно собрать как смарт-контракт. Это еще не аудит, но без успешной сборки дальнейшая проверка безопасности невозможна.",
  },
  {
    program: "Mythril",
    status: "Transport проверен частично",
    report: "/security/mythril-transport.json",
    command: "myth analyze -f transport-bytecode.hex --execution-timeout 60 --max-depth 22 --no-onchain-data -o json",
    output: "Для Transport bytecode программа вернула success=true, issues=0 в ограниченном 60-секундном прогоне.",
    human:
      "В этом конкретном ограниченном прогоне Mythril не нашел exploit в Transport. Это хороший сигнал, но не финальное доказательство безопасности всех контрактов.",
  },
  {
    program: "Solhint",
    status: "Отчет получен",
    report: "/security/solhint-report.txt",
    command: "solhint 'contracts/**/*.sol' > solhint-report.txt",
    output: "Программа выдала предупреждения по стилю, NatSpec, imports, compiler-version и технической гигиене Solidity-кода.",
    human:
      "Это проверка качества кода. Она не отвечает напрямую на вопрос 'украдут ли деньги', но помогает привести код к стандарту, чтобы security-review был чище и понятнее.",
  },
];

const externalTrustGaps = [
  {
    title: "Публичный репозиторий",
    status: "Нужно опубликовать",
    why: "Без исходного кода внешний человек не сможет самостоятельно прогнать Slither, Foundry или Mythril и сверить наши выводы.",
    next: "Добавить ссылку на GitHub / verified source до публичного статуса.",
  },
  {
    title: "Адрес deployed-контракта",
    status: "Нужно указать",
    why: "Пользователь должен иметь возможность открыть контракт в BscScan и убедиться, что проверяемый код соответствует работающей версии.",
    next: "Добавить contract registry: network, address, explorer, version, date.",
  },
  {
    title: "Полные прогоны Mythril / Aderyn",
    status: "В работе",
    why: "Сейчас Mythril показан только для Transport в ограниченном прогоне. Для сильного вывода нужны отчеты по финальной версии всех контрактов.",
    next: "Опубликовать полные отчеты и короткий human-readable summary.",
  },
  {
    title: "Invariant tests и fuzzing",
    status: "Следующий этап",
    why: "Именно эти тесты доказывают сценарии: чужой claim, двойной claim, превышение суммы, owner-only Transport и корректный учет выплат.",
    next: "Добавить Foundry tests, сценарии и результаты прогонов.",
  },
  {
    title: "Owner control policy",
    status: "Раскрыть отдельно",
    why: "Owner-полномочия — это не внешний взлом, но это важный архитектурный риск. Нужны multisig/timelock или честное раскрытие текущей модели.",
    next: "Опубликовать документ owner-полномочий: treasury, fee, tokenId, Transport.",
  },
  {
    title: "Testnet battle test",
    status: "Не проведен",
    why: "Публичное testnet-испытание показывает, что сценарии проверяются не только командой, но и внешними участниками.",
    next: "Запустить testnet challenge с правилами, bounty и отчетом по найденным проблемам.",
  },
];

const safetyClaims = [
  {
    title: "Чужой claim закрыт проверкой владельца",
    status: "Проверено вручную",
    level: "strong",
    plain: "Посторонний адрес не должен иметь возможность запросить выплату по чужому ордеру.",
    proof: "В UnityLockup.claim и UnityDaily.claim есть проверка владельца ордера: действие доступно только адресу owner.",
  },
  {
    title: "Повторный claim ограничен логикой ордера",
    status: "Проверено вручную",
    level: "strong",
    plain: "Один и тот же lockup-ордер не должен быть выведен повторно.",
    proof: "В UnityLockup используется notClaimed, а в Daily логика опирается на started, lastClaimed и лимит периодов.",
  },
  {
    title: "Пользовательские операции защищены от reentrancy",
    status: "Базовая защита есть",
    level: "strong",
    plain: "Контракт снижает риск повторного входа во время lockup/claim.",
    proof: "Ключевые пользовательские lockup и claim используют nonReentrant. Transport нужно привести к такому же стандарту.",
  },
  {
    title: "ERC20-переводы идут через SafeERC20",
    status: "Проверено вручную",
    level: "strong",
    plain: "Работа с токеном выполняется через безопасные helper-функции, а не через голые transfer-вызовы.",
    proof: "В контрактах используются SafeERC20-операции, что снижает риск ошибок при нестандартном поведении токена.",
  },
  {
    title: "Owner-функции вынесены как отдельный риск",
    status: "Раскрыть публично",
    level: "caution",
    plain: "Это не внешний взлом, а управленческие полномочия системы.",
    proof: "Treasury, fee, tokenId и Transport относятся к owner-полномочиям. Их нужно описывать отдельно от взломоустойчивости.",
  },
  {
    title: "LP-логика требует дополнительных тестов",
    status: "Следующий этап",
    level: "pending",
    plain: "Исполнение выплат зависит не только от кода claim, но и от состояния Pancake V3 LP-позиции.",
    proof: "Нужны slippage/min-output правила, stress-test LP-позиции и мониторинг доступности claim.",
  },
];

const trustLadder = [
  ["Можно сказать сейчас", "В коде есть базовые защитные механизмы: проверка владельца ордера, защита пользовательских claim от reentrancy, SafeERC20 и owner-only ограничения."],
  ["Нужно говорить честно", "Это Security Review in progress, а не внешний аудит. Часть автоматических отчетов уже собрана, часть тестов еще готовится."],
  ["Нельзя говорить сейчас", "Нельзя писать Audited, 100% secure, невозможно взломать, выплаты гарантированы или участие без риска."],
  ["Что даст сильный статус", "Invariant tests, fuzzing, testnet battle test и отдельный документ по owner-полномочиям."],
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
          <p>Базовые защитные механизмы найдены и описаны. Полный публичный статус появится после invariant tests, fuzzing и testnet battle test.</p>
          <div className="analytics-security-progress-list" aria-label="Этапы проверки">
            <em>Manual code review</em>
            <em>Auto-analysis reports</em>
            <em>Invariant tests</em>
            <em>External audit</em>
          </div>
        </div>
      </div>

      <div className="analytics-security-section analytics-security-answer">
        <div className="analytics-security-answer-main">
          <span className="analytics-kicker">Главный ответ</span>
          <h3>Пока корректно говорить так: код имеет базовые защитные механизмы и проходит Security Review.</h3>
          <p>
            Это сильнее, чем просто “мы безопасные”, потому что показывает конкретику: проверка владельца ордера,
            защита от повторного входа, безопасные ERC20-операции, owner-only ограничения и опубликованные отчеты.
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
          <span>01</span>
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
          <span>02</span>
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
          <span>03</span>
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
          <span>04</span>
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
          <span>05</span>
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
          <span>06</span>
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
          <span>07</span>
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
            <span>08</span>
            <h3>Нельзя писать</h3>
          </div>
          <div className="analytics-security-tags">
            {forbiddenTexts.map((text) => <span key={text}>{text}</span>)}
          </div>
        </div>
        <div>
          <div className="analytics-security-section-head">
            <span>09</span>
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
