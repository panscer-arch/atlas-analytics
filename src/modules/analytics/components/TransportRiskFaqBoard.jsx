const summaryCards = [
  {
    label: "Статус риска",
    value: "High / Critical",
    text: "Transport является privileged function и создает administrative trust risk.",
  },
  {
    label: "Причина",
    value: "Off-chain partner logic",
    text: "Сложная партнерская программа считается на backend, а выплаты исполняются через authorized addresses.",
  },
  {
    label: "Публичная рамка",
    value: "Hybrid Web3",
    text: "Atlas Core V1 нельзя описывать как fully trustless или fully decentralized.",
  },
  {
    label: "Контроль",
    value: "Disclosure + monitoring",
    text: "Риск не исчезает, но раскрывается, логируется on-chain и должен контролироваться публичной отчетностью.",
  },
];

const faqItems = [
  {
    question: "Что такое Transport в Atlas Core V1?",
    answer:
      "Transport — это специальный механизм для исполнения части партнерских выплат и инфраструктурных операций. В текущей архитектуре он связан с off-chain расчетом партнерской логики: backend считает сложные начисления, а authorized system addresses инициируют выплату через смарт-контракт.",
    note:
      "Писать как архитектурный механизм, а не как скрытую функцию. Обязательно объяснять, зачем он нужен и какие trust assumptions создает.",
  },
  {
    question: "Может ли Transport выводить средства из смарт-контракта?",
    answer:
      "Да. Transport обладает расширенными административными полномочиями. Если authorized addresses инициируют Transport-операцию, из контракта может быть выведена значительная сумма. Поэтому Transport должен быть раскрыт как privileged function risk / administrative trust risk.",
    note:
      "Не смягчать смысл. Формулировка должна быть честной: это не просто техническая деталь, а существенный trust boundary текущей версии.",
  },
  {
    question: "Это хакерская уязвимость или архитектурный риск?",
    answer:
      "Это не exploit в классическом смысле и не ошибка доступа, если функция работает именно так, как задумано. Это архитектурный centralization risk: система защищает от внешнего злоумышленника одними механизмами, но при этом сохраняет доверие к authorized system addresses.",
    note:
      "В аудите это может быть классифицировано как High или Critical centralization risk. С этим не нужно спорить; нужно раскрывать и ограничивать.",
  },
  {
    question: "Спасает ли multisig от этого риска?",
    answer:
      "Multisig снижает риск единоличного действия одного человека, но не устраняет сам privileged-function risk. Если группа подписантов злоупотребит полномочиями, техническая возможность Transport-операции все равно сохраняется.",
    note:
      "Правильная формулировка: multisig is a control, not a complete mitigation.",
  },
  {
    question: "Почему партнерскую программу не сделать полностью on-chain?",
    answer:
      "Полная on-chain реализация многоуровневой партнерской программы может резко увеличить сложность контракта, стоимость транзакций, attack surface и риск ошибок. Поэтому в Atlas Core V1 выбран гибридный подход: Smart Cycle работает через on-chain слой, а часть партнерской логики рассчитывается off-chain и исполняется через Transport.",
    note:
      "Важно не продавать это как идеальную децентрализацию. Это компромисс первой версии между масштабируемостью, стоимостью и прозрачностью.",
  },
  {
    question: "Можно ли проверить злоупотребление Transport?",
    answer:
      "Да, если все Transport-операции фиксируются on-chain и сопровождаются публичной отчетностью. Пользователь или внешний reviewer может сравнивать объем Transport-выводов с правилами партнерской программы, начислениями, лимитами, dashboard-метриками и экономикой системы.",
    note:
      "Сильный контроль здесь не обещание команды, а traceability: транзакции, события, dashboard, публичные правила и сверяемые отчеты.",
  },
  {
    question: "Что значит platform fee 10% при Transport?",
    answer:
      "При Transport-операциях применяется platform fee согласно правилам системы. Но наличие platform fee не устраняет administrative trust risk, потому что authorized addresses сохраняют возможность инициировать Transport-операции.",
    note:
      "Не подавать 10% fee как защиту. Это часть экономики операции, но не security mitigation.",
  },
  {
    question: "Как правильно отвечать аудитору, если он напишет Critical?",
    answer:
      "Правильная позиция: команда согласна, что Transport является существенным privileged-function risk. Это не непреднамеренная уязвимость, а раскрытый архитектурный trust boundary Atlas Core V1. Риск документируется, owner powers раскрываются, authorized addresses публикуются, операции логируются on-chain, а в следующих версиях риск должен снижаться.",
    note:
      "Не спорить с классификацией, если технически Transport действительно может вывести любую сумму.",
  },
  {
    question: "Какую публичную формулировку использовать?",
    answer:
      "Atlas Core V1 is a hybrid Web3 architecture with disclosed administrative controls. The on-chain Smart Cycle layer can be independently inspected, while selected partner-program operations are executed through privileged Transport functions based on off-chain calculations.",
    note:
      "На русском: гибридная Web3-архитектура с раскрытыми административными полномочиями.",
  },
  {
    question: "Что нельзя писать публично?",
    answer:
      "Нельзя писать: fully trustless, fully decentralized, администрация не может повлиять на средства, 100% secure, невозможно злоупотребление, audited без внешнего аудита, пользовательские средства полностью защищены от административного риска.",
    note:
      "Особенно нельзя смешивать защиту от внешнего хакера и доверие к authorized system addresses.",
  },
];

const controlItems = [
  "Multisig для authorized system addresses.",
  "Публичный список authorized addresses.",
  "Описание всех Transport-полномочий: что может и чего не может функция.",
  "On-chain events для каждой Transport-операции.",
  "Публичный Transport dashboard: дата, сумма, адрес, основание, связанный партнерский расчет.",
  "Сверка Transport-выводов с правилами партнерской программы и фактическими начислениями.",
  "Лимиты на операцию или период, если это возможно реализовать без поломки логики.",
  "Отдельный Owner Powers Disclosure.",
  "План V2 по снижению administrative trust risk.",
];

const wordingRows = [
  ["Правильно", "Transport является privileged function и создает administrative trust risk."],
  ["Правильно", "Multisig снижает риск единоличного действия, но не устраняет сам Transport-risk."],
  ["Правильно", "Все Transport-операции должны быть on-chain traceable и сверяемы с публичной партнерской логикой."],
  ["Неправильно", "Мы можем вывести средства, но не будем, потому что нам это невыгодно."],
  ["Неправильно", "10% platform fee защищает пользователей от злоупотребления Transport."],
  ["Неправильно", "Atlas Core V1 fully trustless / fully decentralized."],
];

function TransportRiskFaqBoard() {
  return (
    <section className="analytics-surface analytics-security-board">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Audit Risk FAQ</span>
          <h2 className="analytics-agent-template-title">Пояснение к audit-risk по Transport</h2>
          <p className="analytics-page-subtitle">
            Раздел для человека, который увидит в независимом аудите High / Critical по Transport или owner powers.
            Смысл: риск не прячем, не спорим с аудитором, а объясняем архитектуру, границы доверия и способы проверки.
          </p>
        </div>
      </div>

      <div className="analytics-security-hero-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="analytics-security-hero-card">
            <span>{card.label}</span>
            <h3>{card.value}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>

      <div className="analytics-security-section">
          <div className="analytics-security-section-head">
            <span>01</span>
          <h3>FAQ для чтения аудита</h3>
        </div>
        <div className="analytics-security-completion-list">
          {faqItems.map((item) => (
            <article key={item.question}>
              <span>FAQ</span>
              <h4>{item.question}</h4>
              <p>{item.answer}</p>
              <small>{item.note}</small>
            </article>
          ))}
        </div>
      </div>

      <div className="analytics-security-section analytics-security-two-columns">
        <div>
          <div className="analytics-security-section-head">
            <span>02</span>
            <h3>Контроли и раскрытие</h3>
          </div>
          <div className="analytics-security-tags">
            {controlItems.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <div>
          <div className="analytics-security-section-head">
            <span>03</span>
            <h3>Формулировки</h3>
          </div>
          <div className="analytics-security-check-grid">
            {wordingRows.map(([status, text]) => (
              <article key={text} className="analytics-security-check-card">
                <h4>{status}</h4>
                <p>{text}</p>
                <span>{status === "Правильно" ? "use" : "avoid"}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TransportRiskFaqBoard;
