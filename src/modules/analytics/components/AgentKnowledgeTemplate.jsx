import { useState } from "react";

const AGENT_KNOWLEDGE_STORAGE_KEY = "atlas.analytics.agentKnowledgeTemplate.v1";

const defaultKnowledgeSections = [
  {
    id: "general",
    title: "ОБЩАЯ ИНФОРМАЦИЯ",
    rows: [
      ["Название проекта", "Atlas System"],
      ["Слоган", "Просто. Прозрачно. Прибыльно"],
      ["Тип проекта", "Web3 ecosystem"],
      ["Основной продукт", "Smart Cycle 1"],
      ["Тип системы", "Smart-contract mutual financing"],
      ["DAO", "Да"],
      ["MLM", "Да"],
    ],
  },
  {
    id: "blockchain",
    title: "BLOCKCHAIN / WEB3",
    rows: [
      ["Основной блокчейн", "BSC"],
      ["Поддерживаемые сети", "BSC / Ethereum / Polygon"],
      ["Стандарт токенов", "BEP20"],
      ["Нативная валюта газа", "BNB"],
      ["Проверка транзакций", "BscScan"],
      ["DAO", "Да"],
      ["Smart-contract", "Да"],
    ],
  },
  {
    id: "payments",
    title: "ВАЛЮТЫ И ПЛАТЕЖИ",
    rows: [
      ["Основная валюта", "USDT"],
      ["Сеть USDT", "BEP20"],
      ["Минимальный депозит", "10$"],
      ["Platform Fee", "10%"],
      ["Комиссия удерживается", "Только с дельты и бонусов"],
    ],
  },
  {
    id: "smart-cycle",
    title: "SMART CYCLE",
    rows: [
      ["Типы циклов", "Lockup Flow / Daily Flow"],
      ["Минимальный срок", "10 минут"],
      ["Максимальный срок", "200 дней"],
      ["Минимальная сумма", "10$"],
      ["Выплаты зависят", "От ликвидности"],
    ],
  },
  {
    id: "lockup-flow",
    title: "LOCKUP FLOW",
    rows: [
      ["Contract Test", "10 минут / 0%"],
      ["Launch", "1 день / +0.3%"],
      ["Momentum", "5 дней / +2%"],
      ["Premiere", "10 дней / +5%"],
      ["President", "20 дней / +12%"],
      ["Imperium", "30 дней / +22.5%"],
    ],
  },
  {
    id: "daily-flow",
    title: "DAILY FLOW",
    rows: [
      ["Срок", "200 дней"],
      ["Daily rate", "0.6-0.8%"],
      ["Максимальная дельта", "120-160%"],
      ["Выплаты", "Daily"],
      ["Тело включено", "Да"],
      ["Elite threshold", "2000$"],
    ],
  },
  {
    id: "mlm",
    title: "ПАРТНЕРСКАЯ ПРОГРАММА",
    rows: [
      ["Тип MLM", "Линейный"],
      ["Компрессия", "Да"],
      ["Unlimited depth", "Да"],
      ["Минимальный статус", "Start"],
      ["Максимальный статус", "Executive"],
      ["Максимальный %", "60%"],
      ["Matching bonus", "До 25%"],
      ["Начисление", "От дельты"],
      ["Lifetime структура", "Да"],
    ],
  },
  {
    id: "statuses",
    title: "СТАТУСЫ",
    rows: [
      ["Builder", "1-7"],
      ["Master", "1-7"],
      ["Высшие статусы", "Strategist / Ambassador / Architect / Executive"],
      ["Цвета", "Orange / White"],
      ["Иконки", "Helmets"],
    ],
  },
  {
    id: "revshare",
    title: "REVSHARE",
    rows: [
      ["Минимальная ставка", "30%"],
      ["Максимальная ставка", "45%"],
      ["Lifetime", "Да"],
      ["Traffic Storm", "Да"],
      ["Топ бонус", "5000$"],
      ["Модель выплат", "30/70"],
    ],
  },
  {
    id: "dao",
    title: "DAO",
    rows: [
      ["10$ =", "1 vote"],
      ["Governance", "Да"],
      ["Voting", "DAO-based"],
    ],
  },
  {
    id: "cryptowallet",
    title: "CRYPTOWALLET",
    rows: [
      ["Тип", "Non-custodial"],
      ["Seed phrase", "Да"],
      ["WalletConnect", "Да"],
    ],
  },
  {
    id: "p2p",
    title: "P2P EXCHANGE",
    rows: [
      ["Escrow", "Да"],
      ["P2P", "Да"],
    ],
  },
  {
    id: "swap-dao",
    title: "SWAP DAO",
    rows: [
      ["Тип DEX", "AMM"],
      ["Аналоги", "PancakeSwap / Uniswap"],
    ],
  },
  {
    id: "security",
    title: "БЕЗОПАСНОСТЬ",
    rows: [
      ["Open source", "Планируется"],
      ["Audit", "Планируется"],
    ],
  },
  {
    id: "legal",
    title: "ЮРИДИЧЕСКИЙ БЛОК",
    rows: [
      ["Не является инвестицией", "Да"],
      ["Risk disclaimer", "Да"],
      ["Гарантии дохода", "Нет"],
    ],
  },
  {
    id: "analytics",
    title: "АНАЛИТИКА",
    rows: [
      ["Средний депозит", "1000$"],
      ["Средний срок активности", "5 месяцев"],
    ],
  },
  {
    id: "crm",
    title: "CRM / USER STATES",
    rows: [
      ["Registered", "Да"],
      ["First deposit", "Да"],
      ["Active", "Да"],
      ["Inactive", "Да"],
      ["Builder", "Да"],
      ["Whale", "Да"],
    ],
  },
  {
    id: "brand",
    title: "КОНТЕНТ И БРЕНД",
    rows: [
      ["Tone of voice", "Спокойный / технологичный"],
      ["Основные триггеры", "Прозрачность / DAO / lifetime"],
      ["Запрещенные слова", "Гарантия / инвестиция"],
    ],
  },
].map((section) => ({
  ...section,
  rows: section.rows.map(([parameter, value], index) => ({
    id: `${section.id}-${index}`,
    parameter,
    value,
    comment: "",
  })),
}));

const defaultNotes = [
  {
    id: "notes-1",
    title: "Свободные заметки",
    text: "Добавляй сюда спорные формулировки, новые параметры, уточнения для AI-агента и варианты ответов, которые нужно потом перенести в таблицы.",
  },
];

function readStoredTemplate() {
  if (typeof window === "undefined") {
    return { sections: defaultKnowledgeSections, notes: defaultNotes };
  }

  try {
    const saved = window.localStorage.getItem(AGENT_KNOWLEDGE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { sections: defaultKnowledgeSections, notes: defaultNotes };
  } catch {
    return { sections: defaultKnowledgeSections, notes: defaultNotes };
  }
}

function persistTemplate(template) {
  try {
    window.localStorage.setItem(AGENT_KNOWLEDGE_STORAGE_KEY, JSON.stringify(template));
  } catch {
    // Документ продолжит работать до перезагрузки страницы, даже если localStorage недоступен.
  }
}

function createRow(sectionId) {
  return {
    id: `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    parameter: "",
    value: "",
    comment: "",
  };
}

function createNote() {
  return {
    id: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Новый блок",
    text: "",
  };
}

function AgentKnowledgeTemplate() {
  const [template, setTemplate] = useState(readStoredTemplate);

  function updateTemplate(updater) {
    setTemplate((current) => {
      const next = updater(current);
      persistTemplate(next);
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

  function updateNote(noteId, field, value) {
    updateTemplate((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === noteId ? { ...note, [field]: value } : note)),
    }));
  }

  function addNote() {
    updateTemplate((current) => ({ ...current, notes: [...current.notes, createNote()] }));
  }

  function removeNote(noteId) {
    updateTemplate((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== noteId) }));
  }

  function resetTemplate() {
    updateTemplate(() => ({ sections: defaultKnowledgeSections, notes: defaultNotes }));
  }

  return (
    <section className="analytics-surface analytics-agent-template mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">AI-agent knowledge base</span>
          <h2 className="analytics-agent-template-title">Atlas Agent Knowledge Parameters Template</h2>
          <p className="analytics-page-subtitle mb-0">
            База параметров для обучения AI-агента Atlas System. Все поля редактируются, строки можно добавлять и удалять.
          </p>
        </div>
        <button type="button" className="btn analytics-launch-reset-btn" onClick={resetTemplate}>
          Сбросить шаблон
        </button>
      </div>

      <div className="analytics-agent-template-grid">
        {template.sections.map((section) => (
          <div key={section.id} className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <h3>{section.title}</h3>
              <button type="button" className="btn analytics-agent-template-add-row" onClick={() => addRow(section.id)}>
                + строка
              </button>
            </div>
            <div className="table-responsive">
              <table className="table analytics-table analytics-agent-template-table mb-0">
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>Значение</th>
                    <th>Ваш вариант / комментарий</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.parameter}
                          onChange={(event) => updateRow(section.id, row.id, "parameter", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.value}
                          onChange={(event) => updateRow(section.id, row.id, "value", event.target.value)}
                          rows="2"
                        />
                      </td>
                      <td>
                        <textarea
                          className="analytics-agent-template-input"
                          value={row.comment}
                          onChange={(event) => updateRow(section.id, row.id, "comment", event.target.value)}
                          placeholder="Ваш вариант ответа или уточнение"
                          rows="2"
                        />
                      </td>
                      <td>
                        <button type="button" className="btn analytics-launch-icon-btn analytics-launch-delete-btn" onClick={() => removeRow(section.id, row.id)} title="Удалить строку">
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-agent-notes">
        <div className="analytics-agent-template-card-head">
          <h3>ДОПОЛНИТЕЛЬНЫЕ ИДЕИ / ЗАМЕТКИ</h3>
          <button type="button" className="btn analytics-agent-template-add-row" onClick={addNote}>
            + блок
          </button>
        </div>
        <div className="analytics-agent-notes-grid">
          {template.notes.map((note) => (
            <div key={note.id} className="analytics-agent-note-card">
              <input
                className="analytics-agent-template-input analytics-agent-note-title"
                value={note.title}
                onChange={(event) => updateNote(note.id, "title", event.target.value)}
                placeholder="Название блока"
              />
              <textarea
                className="analytics-agent-template-input"
                value={note.text}
                onChange={(event) => updateNote(note.id, "text", event.target.value)}
                placeholder="Свободные идеи, заметки, спорные формулировки"
                rows="6"
              />
              <button type="button" className="btn analytics-launch-delete-btn analytics-agent-note-delete" onClick={() => removeNote(note.id)}>
                Удалить блок
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AgentKnowledgeTemplate;
