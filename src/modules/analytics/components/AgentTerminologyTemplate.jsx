import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const AGENT_TERMINOLOGY_STORAGE_KEY = "atlas.analytics.agentTerminologyTemplate.v2";

const defaultTerminologySections = [
  {
    id: "core",
    title: "БАЗОВЫЕ ПОНЯТИЯ",
    rows: [
      ["Atlas System", "Цифровая касса взаимопомощи нового поколения на базе Web3, smart-contract и DAO-механик.", "Базовая публичная формулировка для презентаций, FAQ и AI-агента."],
      ["Участник", "Человек, который подключил кошелёк и добровольно участвует в системе взаимной помощи через личный кабинет.", "Не называть клиентом: в манифесте участник — соисследователь и со-создатель системы."],
      ["Регистрация", "Первое подключение MetaMask или другого поддерживаемого кошелька к личному кабинету.", "Важно: email-регистрации нет."],
      ["Личный кабинет", "Интерфейс участника для создания тикетов помощи, отслеживания смарт-циклов, запроса помощи, статусов, партнёрки и материалов.", ""],
      ["Сообщество", "Участники, лидеры и команды, которые помогают объяснять правила взаимопомощи, обучать новичков и развивать систему.", ""],
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
      ["Smart Cycle", "Смарт-цикл взаимной помощи на выбранный срок, который создаётся и исполняется через smart-contract.", "Ядро Smart Cycle 1 и всей текущей логики Atlas."],
      ["Тикет помощи", "Запись о том, что участник оказал помощь системе на выбранную сумму и период через smart-contract.", "Можно использовать в интерфейсе как понятную единицу цикла."],
      ["Создание тикета", "Подтверждённая транзакция, при которой участник оказывает помощь системе: выбирает сумму, период и подписывает действие в кошельке.", "Не называть публично «депозитом» или «инвестицией»."],
      ["Сумма оказанной помощи", "Размер средств, которые участник добровольно направил в smart-contract в рамках тикета помощи.", "Это корректная замена словам «вклад», «депозит», «тело депозита»."],
      ["Lockup Flow", "Смарт-цикл с фиксированным сроком, после которого участник может одной транзакцией запросить возврат суммы помощи и добавочную помощь.", ""],
      ["Daily Flow", "Смарт-цикл на 200 дней, где участнику предоставляется право ежедневно запрашивать помощь по условиям smart-contract.", ""],
      ["Запрос помощи", "Действие, которым участник после выполнения условий тикета запрашивает доступную помощь у системы.", "Это публичная замена слову Claim."],
      ["Claim", "Техническое Web3-действие запроса помощи в smart-contract после выполнения условий смарт-цикла.", "В интерфейсе можно оставить как технический термин, но в объяснениях писать «запросить помощь»."],
      ["Дельта", "Добавочная помощь сверх суммы оказанной помощи, предусмотренная условиями смарт-цикла и доступная к запросу при наличии ликвидности.", "Не писать как гарантированную прибыль или доход."],
      ["Новые деньги", "Любой новый вход средств в smart-contract через новый тикет помощи, даже если участник недавно запросил помощь и снова участвует.", "Ключевое определение для аналитики."],
      ["Обязательства", "Сумма оказанной помощи по активным тикетам плюс предусмотренная добавочная помощь, которую система должна исполнить по текущим правилам при наличии ликвидности.", ""],
    ],
  },
  {
    id: "partner",
    title: "ПАРТНЁРКА",
    rows: [
      ["Партнёрская программа", "Система начислений от добавочной помощи структуры с учётом статусов, активности и правил компрессии.", ""],
      ["Реферальная ссылка", "Персональная ссылка участника, которая появляется после создания первого смарт-цикла от минимальной суммы.", "Сверить финальную сумму активации: сейчас в материалах от 10 $."],
      ["Статус", "Квалификация участника, влияющая на процент партнёрских начислений от добавочной помощи структуры.", ""],
      ["Компрессия", "Логика перераспределения уровней, когда промежуточные участники не соответствуют условиям квалификации.", "Нужно сверить с финальной таблицей партнерки."],
      ["Matching bonus", "Дополнительный бонус от партнёрских начислений лично приглашённого участника при выполнении статусных условий.", ""],
      ["Линейная структура", "Структура приглашений на неограниченную глубину, где учитываются личные и глубинные связи.", ""],
    ],
  },
  {
    id: "finance",
    title: "ДЕНЬГИ / КОМИССИИ",
    rows: [
      ["Platform Fee", "Комиссия платформы, которая удерживается только с полученной добавочной помощи и партнёрских начислений.", "Сейчас базово: 10%; не распространяется на возврат суммы оказанной помощи."],
      ["Smart-contract резерв", "Средства в smart-contract, из которых алгоритм исполняет запросы помощи, комиссии и партнёрские начисления.", "Лучше, чем слово «пул», если хотим звучать юридически аккуратнее."],
      ["Ликвидность", "Доступный объём средств в smart-contract для исполнения запросов помощи и текущих обязательств.", ""],
      ["Входящий поток", "Средства, которые поступают в smart-contract через новые тикеты помощи участников.", ""],
      ["Исходящий поток", "Исполненные запросы помощи, комиссии платформы и партнёрские начисления.", ""],
      ["Чистый поток", "Разница между входящим и исходящим потоком за выбранный период.", "Полезно для аналитики устойчивости кассы взаимопомощи."],
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
      ["Не инвестиция", "Корректная рамка: Atlas — цифровая касса взаимопомощи, а не инвестиционный продукт с обещанием дохода.", "Обязательная формулировка для публичных материалов."],
      ["Не гарантия дохода", "Запрет обещать гарантированный результат, безрисковость, фиксированную прибыль или обязательное исполнение запроса без ликвидности.", ""],
      ["Risk disclaimer", "Предупреждение о рисках Web3, ликвидности, smart-contract и самостоятельной ответственности участника.", "Важно указывать, что запрос помощи исполняется при наличии достаточной ликвидности."],
      ["Оказать помощь", "Корректная формулировка для создания тикета/смарт-цикла вместо слова «инвестировать».", ""],
      ["Запросить помощь", "Корректная формулировка для claim после выполнения условий тикета или в ежедневной логике Daily Flow.", ""],
    ],
  },
  {
    id: "analytics",
    title: "АНАЛИТИКА",
    rows: [
      ["Registered", "Участник, который впервые подключил кошелёк к кабинету.", ""],
      ["First ticket", "Участник, который впервые создал тикет помощи / первый смарт-цикл.", "Лучше, чем First deposit для новой терминологии."],
      ["Active", "Участник с активным тикетом помощи или актуальной активностью по правилам аналитики.", ""],
      ["Inactive", "Участник без новых действий после регистрации, тикета или запроса помощи.", ""],
      ["Web3-воронка", "Путь от открытия сайта до подключения кошелька, первого тикета помощи, запроса помощи и повторного участия.", ""],
      ["Повторное участие", "Создание нового тикета помощи после предыдущего участия или запроса помощи.", "В аналитике это новые деньги."],
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

export const defaultTerminologyTemplate = { sections: defaultTerminologySections };
const TERMINOLOGY_SECTION_DESCRIPTIONS = {
  core: "Главные слова, которыми описываем Atlas, участника, регистрацию и личный кабинет.",
  web3: "Кошелёк, сеть, токены, gas и проверка транзакций в blockchain.",
  cycles: "Тикеты помощи, Smart Cycle, запрос помощи, дельта, новые деньги и обязательства системы.",
  partner: "Партнёрская программа, статусы, компрессия, matching bonus и структура.",
  finance: "Smart-contract резерв, ликвидность, комиссии, входящие и исходящие потоки.",
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
    saveServerContent(AGENT_TERMINOLOGY_STORAGE_KEY, template);
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

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_TERMINOLOGY_STORAGE_KEY).then((savedTemplate) => {
      if (!isMounted || !savedTemplate) return;
      setTemplate(hydrateTemplate(savedTemplate));
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
