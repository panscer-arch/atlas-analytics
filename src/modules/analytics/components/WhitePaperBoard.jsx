import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const WHITE_PAPER_STORAGE_KEY = "atlas.analytics.whitePaper.blocks.v1";

const BLOCK_STATUSES = ["Черновик", "На вычитке", "Готово", "Переписать"];

const defaultWhitePaperBlocks = [
  {
    id: "why-atlas",
    title: "1. Зачем создан Atlas System",
    role: "Проблема и позиционирование",
    status: "Черновик",
    text: `Atlas System создан как технологическая платформа с формализованными правилами участия, предназначенная для организации коллективных финансовых процессов без ручного управления, субъективных решений и неформальных договорённостей.

Задача блока: объяснить, какую рыночную проблему решает Atlas System, почему пользователю нужна предсказуемая система правил и чем проект отличается от моделей, построенных на доверии к людям, ручных решениях или непрозрачных обещаниях.`,
    notes: "Проверить формулировки про рынок, убрать лишние повторы, усилить доказательность.",
  },
  {
    id: "participation",
    title: "2. Что означает участие",
    role: "Механика участия",
    status: "Черновик",
    text: `Участие в Atlas System происходит по заранее установленным правилам. Пользователь взаимодействует не с другими участниками напрямую, а с системой и логикой смарт-циклов.

Задача блока: объяснить, что такое добровольная финансовая помощь сообществу, как создаётся smart cycle, что видит пользователь до запуска цикла и почему правила не должны меняться в процессе.`,
    notes: "Сделать блок максимально понятным для нового пользователя.",
  },
  {
    id: "cycle-types",
    title: "3. Типы циклов",
    role: "Daily Flow / Lock-up Flow",
    status: "Черновик",
    text: `В Atlas System предусмотрены разные типы циклов: циклы с выплатой в конце срока и циклы с ежедневными выплатами.

Задача блока: разложить Daily Flow и Lock-up Flow простым языком, показать разницу по срокам, логике начислений и ожиданиям пользователя. Нужна таблица или компактная сравнительная структура.`,
    notes: "Добавить таблицу сравнения и короткий пример выбора формата.",
  },
  {
    id: "accruals-and-claims",
    title: "4. Начисления и получение средств",
    role: "Расчёты и claim",
    status: "Черновик",
    text: `Начисления и получение средств происходят строго по правилам выбранного цикла. Выплата возможна только при выполнении условий цикла и наличии достаточного баланса в смарт-контракте.

Задача блока: объяснить начисления, доступность выплат, claim, историю операций и ограничение по фактическому балансу смарт-контракта.`,
    notes: "Важно не обещать мгновенную доступность выплат.",
  },
  {
    id: "temporary-unavailable",
    title: "5. Если выплаты временно недоступны",
    role: "Сценарий дефицита ликвидности",
    status: "Черновик",
    text: `Выплата может быть временно недоступна, если на момент обращения в смарт-контракте недостаточно средств. Это не отменяет историю участия и не требует от пользователя дополнительных переводов для разблокировки старых циклов.

Задача блока: честно описать сценарий недостаточного баланса, что пользователю делать не нужно и как система показывает статус выплаты.`,
    notes: "Один из ключевых блоков доверия. Нужна максимально прозрачная формулировка.",
  },
  {
    id: "partner-program",
    title: "6. Партнёрская программа",
    role: "Рекомендации и вознаграждения",
    status: "Черновик",
    text: `Партнёрская программа в Atlas System является дополнительной возможностью, а не обязательным условием участия. Пользователь может участвовать в циклах без приглашения других людей.

Задача блока: объяснить смысл рекомендаций, добровольность партнёрской программы, автоматическое начисление вознаграждений и отсутствие обязательных продаж.`,
    notes: "Отдельно следить, чтобы текст не звучал как давление на привлечение.",
  },
  {
    id: "dao",
    title: "7. DAO и голосование",
    role: "Управление системой",
    status: "Черновик",
    text: `DAO в Atlas System используется для коллективного управления. Вес голоса зависит от рейтинга, который формируется на основе участия в системе.

Задача блока: описать, как принимаются решения, от чего зависит вес голоса, какие ограничения есть у DAO и почему голосование не означает гарантированный контроль.`,
    notes: "Проверить точные параметры рейтинга и границы полномочий DAO.",
  },
  {
    id: "security",
    title: "8. Безопасность и защита средств",
    role: "Смарт-контракты и кошелёк",
    status: "Черновик",
    text: `Безопасность Atlas System строится на том, что ключевые операции выполняются через смарт-контракты, а платформа не хранит приватные ключи и не управляет средствами пользователей вручную.

Задача блока: объяснить роль смарт-контрактов, некастодиальную модель, ответственность пользователя за кошелёк и ограничения восстановления доступа.`,
    notes: "Добавить ссылки на аудит, explorer и адреса контрактов, когда они будут готовы.",
  },
  {
    id: "transparency",
    title: "9. Прозрачность и контроль",
    role: "Проверяемость операций",
    status: "Черновик",
    text: `Прозрачность Atlas System должна опираться не только на утверждения, но и на возможность самостоятельной проверки: история операций, статусы, ссылки на блокчейн, решения DAO и отсутствие скрытых индивидуальных условий.

Задача блока: показать, что именно пользователь может проверить и где он это видит.`,
    notes: "Нужны конкретные ссылки/поля интерфейса после готовности продукта.",
  },
  {
    id: "risks",
    title: "10. Ограничения и риски",
    role: "Юридика и ответственность",
    status: "Черновик",
    text: `Atlas System не является банком, инвестиционным фондом или системой гарантированного результата. Участие связано с рисками блокчейн-инфраструктуры, сетевых комиссий, ликвидности смарт-контракта и ответственности пользователя за кошелёк.

Задача блока: описать ограничения прямо, без смягчения ключевых рисков.`,
    notes: "Согласовать юридические формулировки перед публикацией.",
  },
  {
    id: "technical-appendix",
    title: "11. Техническое приложение",
    role: "Формулы, комиссии, события",
    status: "Черновик",
    text: `Техническое приложение предназначено для разработчиков, аналитиков и продвинутых участников. В нём должны быть формулы начислений, комиссии, партнёрские уровни, DAO-механика, ограничения системы, ключевые события Deposit/Claim и роль backend-системы.

Задача блока: отделить пользовательское объяснение от технической справки и указать, что приоритетным источником истины является код смарт-контрактов.`,
    notes: "Добавить точные формулы и параметры после сверки с контрактами.",
  },
];

function normalizeBlock(block, index = 0) {
  return {
    id: block.id || `white-paper-${Date.now()}-${index}`,
    title: block.title || "Новый блок White Paper",
    role: block.role || "Раздел",
    status: block.status || "Черновик",
    text: block.text || "",
    notes: block.notes || "",
  };
}

function readStoredBlocks() {
  if (typeof window === "undefined") return defaultWhitePaperBlocks;

  try {
    const saved = window.localStorage.getItem(WHITE_PAPER_STORAGE_KEY);
    return saved ? JSON.parse(saved).map(normalizeBlock) : defaultWhitePaperBlocks;
  } catch {
    return defaultWhitePaperBlocks;
  }
}

function persistBlocks(blocks) {
  try {
    window.localStorage.setItem(WHITE_PAPER_STORAGE_KEY, JSON.stringify(blocks));
    saveServerContent(WHITE_PAPER_STORAGE_KEY, blocks);
  } catch {
    // Рабочая версия остаётся в состоянии страницы, даже если storage временно недоступен.
  }
}

function WhitePaperBoard() {
  const [blocks, setBlocks] = useState(readStoredBlocks);
  const [activeBlockId, setActiveBlockId] = useState(() => {
    if (typeof window === "undefined") return defaultWhitePaperBlocks[0].id;
    const url = new URL(window.location.href);
    return url.searchParams.get("block") || defaultWhitePaperBlocks[0].id;
  });

  useEffect(() => {
    let isMounted = true;

    loadServerContent(WHITE_PAPER_STORAGE_KEY).then((savedBlocks) => {
      if (isMounted && Array.isArray(savedBlocks)) setBlocks(savedBlocks.map(normalizeBlock));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeBlock = blocks.find((block) => block.id === activeBlockId) || blocks[0];
  const stats = useMemo(() => {
    const ready = blocks.filter((block) => block.status === "Готово").length;
    const review = blocks.filter((block) => block.status === "На вычитке").length;
    const chars = blocks.reduce((sum, block) => sum + block.text.length, 0);
    return [
      ["Блоков", blocks.length],
      ["На вычитке", review],
      ["Готово", ready],
      ["Символов", chars.toLocaleString("ru-RU")],
    ];
  }, [blocks]);

  useEffect(() => {
    if (!activeBlock || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("board", "whitePaper");
    url.searchParams.set("block", activeBlock.id);
    window.history.replaceState({}, "", url.toString());
  }, [activeBlock]);

  function updateBlocks(updater) {
    setBlocks((current) => {
      const next = updater(current);
      persistBlocks(next);
      return next;
    });
  }

  function updateBlock(blockId, patch) {
    updateBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)));
  }

  function addBlock() {
    const block = normalizeBlock({
      id: `white-paper-${Date.now()}`,
      title: "Новый блок White Paper",
      role: "Рабочий раздел",
      text: "",
      notes: "",
    });
    updateBlocks((current) => [...current, block]);
    setActiveBlockId(block.id);
  }

  if (!activeBlock) return null;

  return (
    <section className="analytics-surface analytics-agent-template analytics-agent-dataset mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">White Paper</span>
          <h2 className="analytics-agent-template-title">White Paper: структура по блокам</h2>
          <p className="analytics-page-subtitle mb-0">
            Рабочая вкладка для постепенного наполнения, редактуры и вычитки White Paper по разделам.
          </p>
        </div>
        <AnalyticsActionButton variant="primary" size="sm" onClick={addBlock}>
          + блок
        </AnalyticsActionButton>
      </div>

      <div className="analytics-agent-dataset-stats">
        {stats.map(([label, value]) => (
          <div key={label} className="analytics-agent-dataset-stat">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="analytics-dataset-editor">
        <aside className="analytics-dataset-sidebar">
          <span className="analytics-kicker">Блоки документа</span>
          {blocks.map((block, index) => (
            <button
              key={block.id}
              type="button"
              className={`analytics-agent-template-tab${activeBlock.id === block.id ? " analytics-agent-template-tab-active" : ""}`}
              onClick={() => setActiveBlockId(block.id)}
            >
              <span>{index + 1}</span>
              {block.title}
            </button>
          ))}
        </aside>

        <div className="analytics-dataset-main">
          <div className="analytics-dataset-meta-row">
            <label>
              Статус
              <select className="analytics-agent-template-input" value={activeBlock.status} onChange={(event) => updateBlock(activeBlock.id, { status: event.target.value })}>
                {BLOCK_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Роль блока
              <input className="analytics-agent-template-input" value={activeBlock.role} onChange={(event) => updateBlock(activeBlock.id, { role: event.target.value })} />
            </label>
          </div>

          <label className="analytics-program-field">
            Название
            <input className="analytics-agent-template-input" value={activeBlock.title} onChange={(event) => updateBlock(activeBlock.id, { title: event.target.value })} />
          </label>

          <label className="analytics-program-field">
            Текст блока
            <textarea className="analytics-agent-template-input analytics-dataset-source" value={activeBlock.text} onChange={(event) => updateBlock(activeBlock.id, { text: event.target.value })} rows="20" />
          </label>

          <label className="analytics-program-field">
            Заметки для вычитки
            <textarea className="analytics-agent-template-input" value={activeBlock.notes} onChange={(event) => updateBlock(activeBlock.id, { notes: event.target.value })} rows="5" />
          </label>
        </div>
      </div>
    </section>
  );
}

export default WhitePaperBoard;
