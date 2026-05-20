import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";

const AGENT_TERMINOLOGY_STORAGE_KEY = "atlas.analytics.agentTerminologyTemplate.v1";

const defaultTerminologySections = [
  {
    id: "core",
    title: "БАЗОВЫЕ ПОНЯТИЯ",
    rows: [
      ["Atlas System", "Web3-экосистема и цифровая система взаимного финансирования на базе smart-contract логики.", "Базовое описание для презентаций, FAQ и AI-агента."],
      ["Участник", "Человек, который подключил кошелёк и взаимодействует с Atlas через личный кабинет.", "Не называть клиентом, если нужна модель сообщества."],
      ["Регистрация", "Первое подключение MetaMask или другого поддерживаемого кошелька к личному кабинету.", "Важно: email-регистрации нет."],
      ["Личный кабинет", "Интерфейс участника для циклов, claim, статусов, партнерки, материалов и состояния кошелька.", ""],
      ["Сообщество", "Участники, лидеры и команды, которые помогают объяснять механику, обучать новичков и развивать систему.", ""],
    ],
  },
  {
    id: "web3",
    title: "WEB3 / КОШЕЛЁК",
    rows: [
      ["MetaMask", "Non-custodial кошелёк, через который участник авторизуется и подписывает действия в Atlas.", "Уточнить список поддерживаемых кошельков после релиза."],
      ["WalletConnect", "Способ подключить внешний криптокошелёк к интерфейсу без хранения ключей на стороне Atlas.", ""],
      ["BSC", "BNB Smart Chain, blockchain-сеть для основной логики транзакций Atlas.", ""],
      ["BEP20", "Стандарт токенов в сети BSC, в котором используется USDT для участия.", ""],
      ["BNB Gas", "BNB, который нужен на кошельке для оплаты комиссии сети при транзакциях.", ""],
      ["BscScan", "Обозреватель сети BSC, где можно проверить транзакции, адреса и события smart-contract.", "Добавить ссылку на контракт после публикации."],
    ],
  },
  {
    id: "cycles",
    title: "SMART CYCLE",
    rows: [
      ["Smart Cycle", "Цикл участия на выбранный срок, который создаётся и исполняется через smart-contract.", ""],
      ["Lockup Flow", "Цикл с фиксированным сроком и итоговым claim после завершения выбранного периода.", ""],
      ["Daily Flow", "Длительный цикл с ежедневной логикой начислений и выплат по правилам продукта.", ""],
      ["Создание цикла", "Подтверждённая транзакция, при которой USDT списываются с кошелька и поступают в smart-contract.", "Можно использовать вместо слова «депозит» в публичных текстах."],
      ["Claim", "Действие, которым участник запрашивает выплату тела и доступной дельты после выполнения условий цикла.", "В коммуникации лучше: «запросить помощь»."],
      ["Дельта", "Добавочная сумма сверх тела цикла, рассчитанная по условиям тарифа и доступной ликвидности.", "Не писать как гарантированную прибыль."],
      ["Новые деньги", "Любой новый вход средств в smart-contract через повторный цикл, даже если участник недавно сделал claim.", "Это ключевое определение для аналитики."],
      ["Обязательства", "Тело активных циклов плюс добавочная дельта, которую система должна выплатить по текущим правилам.", ""],
    ],
  },
  {
    id: "partner",
    title: "ПАРТНЁРКА",
    rows: [
      ["Партнёрская программа", "Система начислений от дельты приглашённых участников с учётом статусов, структуры и правил компрессии.", ""],
      ["Реферальная ссылка", "Персональная ссылка участника, которая появляется после выполнения условий активации партнерки.", ""],
      ["Статус", "Квалификация участника, влияющая на процент партнёрских начислений и доступ к дополнительным бонусам.", ""],
      ["Компрессия", "Логика перераспределения уровней, когда промежуточные участники не соответствуют условиям квалификации.", "Нужно сверить с финальной таблицей партнерки."],
      ["Matching bonus", "Дополнительный бонус с дохода по партнерской программе лично приглашённого участника начиная с Master.", ""],
      ["Линейная структура", "Структура приглашений на неограниченную глубину, где учитываются личные и глубинные связи.", ""],
    ],
  },
  {
    id: "finance",
    title: "ДЕНЬГИ / КОМИССИИ",
    rows: [
      ["Platform Fee", "Комиссия платформы, которая удерживается с дельты и бонусов по правилам smart-contract.", "Сейчас базово: 10%."],
      ["Пул", "Средства в smart-contract, из которых исполняются запросы помощи, комиссии и бонусы.", ""],
      ["Ликвидность", "Доступный объём средств для исполнения claim и текущих обязательств.", ""],
      ["Входящий поток", "Средства, которые поступают в smart-contract через новые циклы участников.", ""],
      ["Исходящий поток", "Выплаты участникам, комиссии платформы и партнерские начисления.", ""],
      ["Чистый поток", "Разница между входящим и исходящим потоком за выбранный период.", "Полезно для аналитики устойчивости."],
    ],
  },
  {
    id: "dao",
    title: "DAO / УПРАВЛЕНИЕ",
    rows: [
      ["DAO", "Механизм участия сообщества в обсуждении и голосовании по важным вопросам развития Atlas.", ""],
      ["Голос", "Единица участия в DAO-голосовании. Базовая гипотеза: 10 USDT участия = 1 vote.", "Проверить финальное правило перед публикацией."],
      ["Governance", "Процесс управления параметрами и решениями системы через правила и голосования.", ""],
      ["Эпоха", "Серия циклов или этап развития системы с возможным управляемым перезапуском через DAO.", "Идея требует отдельного описания."],
    ],
  },
  {
    id: "legal",
    title: "ЮРИДИКА / РИСКИ",
    rows: [
      ["Не инвестиция", "Корректная рамка: Atlas не должен описываться как инвестиционный продукт с обещанием дохода.", "Обязательная формулировка для публичных материалов."],
      ["Не гарантия дохода", "Запрет обещать гарантированный результат, безрисковость или фиксированную прибыль.", ""],
      ["Risk disclaimer", "Предупреждение о рисках Web3, ликвидности, smart-contract и самостоятельной ответственности участника.", ""],
      ["Оказать помощь", "Корректная формулировка для входа в цикл вместо слова «инвестировать».", ""],
      ["Запросить помощь", "Корректная формулировка для claim или вывода после завершения условий цикла.", ""],
    ],
  },
  {
    id: "analytics",
    title: "АНАЛИТИКА",
    rows: [
      ["Registered", "Участник, который впервые подключил кошелёк к кабинету.", ""],
      ["First deposit", "Участник, который впервые создал цикл.", "Можно переименовать в «первый цикл» в русском интерфейсе."],
      ["Active", "Участник с активным циклом или актуальной активностью по правилам аналитики.", ""],
      ["Inactive", "Участник без новых действий после регистрации, цикла или claim.", ""],
      ["Web3-воронка", "Путь от открытия сайта до подключения кошелька, первого цикла, claim и повторного участия.", ""],
      ["Reinvest", "Повторное создание цикла после предыдущего участия или claim.", "В аналитике это новые деньги."],
    ],
  },
].map((section) => ({
  ...section,
  rows: section.rows.map(([term, description, comment], index) => ({
    id: `${section.id}-${index}`,
    term,
    description,
    comment: comment || "",
  })),
}));

const defaultTerminologyTemplate = { sections: defaultTerminologySections };
const TERMINOLOGY_SECTION_DESCRIPTIONS = {
  core: "Главные слова, которыми описываем Atlas, участника, регистрацию и личный кабинет.",
  web3: "Кошелёк, сеть, токены, gas и проверка транзакций в blockchain.",
  cycles: "Smart Cycle, дельта, claim, новые деньги и обязательства системы.",
  partner: "Партнёрская программа, статусы, компрессия, matching bonus и структура.",
  finance: "Пул, ликвидность, комиссии, входящие и исходящие потоки.",
  dao: "DAO, голоса, governance и возможные эпохи развития системы.",
  legal: "Юридически безопасные формулировки, риски и запрещённые обещания.",
  analytics: "CRM-состояния, Web3-воронка и ключевые определения для аналитики.",
};

function hydrateRows(defaultRows, savedRows = []) {
  const savedRowsById = new Map(savedRows.map((row) => [row.id, row]));
  const hydratedDefaultRows = defaultRows.map((defaultRow) => {
    const savedRow = savedRowsById.get(defaultRow.id);
    if (!savedRow) return defaultRow;

    return {
      ...defaultRow,
      term: savedRow.term || defaultRow.term,
      description: savedRow.description || defaultRow.description,
      comment: savedRow.comment || savedRow.source || defaultRow.comment,
    };
  });
  const customRows = savedRows
    .filter((row) => !defaultRows.some((defaultRow) => defaultRow.id === row.id))
    .map((row) => ({ ...row, comment: row.comment || row.source || "" }));

  return [...hydratedDefaultRows, ...customRows];
}

function hydrateTemplate(template) {
  if (!template || !Array.isArray(template.sections)) return defaultTerminologyTemplate;

  const savedSectionsById = new Map(template.sections.map((section) => [section.id, section]));
  const sections = defaultTerminologySections.map((defaultSection) => {
    const savedSection = savedSectionsById.get(defaultSection.id);
    if (!savedSection) return defaultSection;

    return {
      ...defaultSection,
      rows: hydrateRows(defaultSection.rows, savedSection.rows),
    };
  });

  return { sections };
}

function readStoredTerminology() {
  if (typeof window === "undefined") return defaultTerminologyTemplate;

  try {
    const saved = window.localStorage.getItem(AGENT_TERMINOLOGY_STORAGE_KEY);
    return saved ? hydrateTemplate(JSON.parse(saved)) : defaultTerminologyTemplate;
  } catch {
    return defaultTerminologyTemplate;
  }
}

function persistTerminology(template) {
  try {
    window.localStorage.setItem(AGENT_TERMINOLOGY_STORAGE_KEY, JSON.stringify(template));
  } catch {
    // Терминология останется доступна до перезагрузки даже без localStorage.
  }
}

function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    term: "",
    description: "",
    comment: "",
  };
}

function AgentTerminologyTemplate() {
  const [template, setTemplate] = useState(readStoredTerminology);
  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (typeof window === "undefined") return defaultTerminologyTemplate.sections[0]?.id || "core";

    const url = new URL(window.location.href);
    return url.searchParams.get("term") || defaultTerminologyTemplate.sections[0]?.id || "core";
  });

  function updateTemplate(updater) {
    setTemplate((current) => {
      const next = updater(current);
      persistTerminology(next);
      return next;
    });
  }

  function updateRow(sectionId, rowId, field, value) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          rows: section.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
        };
      }),
    }));
  }

  function addRow(sectionId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, rows: [...section.rows, createRow(sectionId)] } : section)),
    }));
  }

  function removeRow(sectionId, rowId) {
    updateTemplate((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === sectionId ? { ...section, rows: section.rows.filter((row) => row.id !== rowId) } : section)),
    }));
  }

  function resetTemplate() {
    updateTemplate(() => defaultTerminologyTemplate);
    setActiveSectionId(defaultTerminologyTemplate.sections[0]?.id || "core");
  }

  const totalTerms = template.sections.reduce((sum, section) => sum + section.rows.length, 0);
  const activeSection = template.sections.find((section) => section.id === activeSectionId) || template.sections[0] || null;
  const activeSectionDescription = activeSection ? TERMINOLOGY_SECTION_DESCRIPTIONS[activeSection.id] : "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isKnownSection = template.sections.some((section) => section.id === activeSectionId);
    const nextSectionId = isKnownSection ? activeSectionId : defaultTerminologyTemplate.sections[0]?.id || "core";

    if (nextSectionId !== activeSectionId) {
      setActiveSectionId(nextSectionId);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", "terminology");
    url.searchParams.set("term", nextSectionId);
    window.history.replaceState({}, "", url.toString());
  }, [activeSectionId, template.sections]);

  return (
    <section className="analytics-surface analytics-agent-template mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Терминология</span>
          <h2 className="analytics-agent-template-title">Глоссарий Atlas System</h2>
          <p className="analytics-page-subtitle mb-0">
            Editable-база терминов для команды и AI-агента. Сейчас в шаблоне {totalTerms} терминов; описание, комментарий и ссылки можно редактировать прямо в таблице.
          </p>
        </div>
        <AnalyticsActionButton variant="secondary" size="sm" onClick={resetTemplate}>
          Сбросить терминологию
        </AnalyticsActionButton>
      </div>

      <div className="analytics-agent-template-tabs" role="tablist" aria-label="Категории терминологии">
        {template.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection?.id === section.id}
            className={`analytics-agent-template-tab${activeSection?.id === section.id ? " analytics-agent-template-tab-active" : ""}`}
            onClick={() => setActiveSectionId(section.id)}
          >
            {section.title}
          </button>
        ))}
      </div>

      {activeSectionDescription ? <p className="analytics-page-subtitle mb-0">{activeSectionDescription}</p> : null}

      {activeSection ? (
        <div className="analytics-agent-template-grid">
          <div className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <h3>{activeSection.title}</h3>
              <AnalyticsActionButton variant="primary" size="sm" onClick={() => addRow(activeSection.id)}>
                + термин
              </AnalyticsActionButton>
            </div>
            <div className="table-responsive">
              <table className="table analytics-table analytics-agent-template-table mb-0">
                <thead>
                  <tr>
                    <th>Термин</th>
                    <th>Описание</th>
                    <th>Комментарий</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {activeSection.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.term}
                          onChange={(event) => updateRow(activeSection.id, row.id, "term", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.description}
                          onChange={(event) => updateRow(activeSection.id, row.id, "description", event.target.value)}
                          rows="3"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.comment || ""}
                          onChange={(event) => updateRow(activeSection.id, row.id, "comment", event.target.value)}
                          placeholder="Источник, спорная формулировка или комментарий для вычитки"
                          rows="2"
                        />
                      </td>
                      <td>
                        <AnalyticsActionButton variant="danger" size="icon" onClick={() => removeRow(activeSection.id, row.id)} title="Удалить термин">
                          x
                        </AnalyticsActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AgentTerminologyTemplate;
