import { useEffect, useMemo, useState } from "react";
import { atlasPdfDatasetBlocks, atlasPdfFullText } from "../data/agentTrainingDatasetPdf";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const AGENT_TRAINING_DATASET_STORAGE_KEY = "atlas.analytics.agentTrainingDataset.v2";

const defaultDatasetBlocks = atlasPdfDatasetBlocks;
export const defaultTrainingDataset = { blocks: defaultDatasetBlocks, fullText: atlasPdfFullText };
const DATASET_STATUSES = ["Черновик", "На вычитке", "Готово", "Не включать"];

function inferGroup(block) {
  const value = `${block.type || ""} ${block.title || ""}`.toLowerCase();
  if (value.includes("партн") || value.includes("revshare")) return "Партнерка / трафик";
  if (value.includes("smart cycle") || value.includes("продукт")) return "Продукты";
  if (value.includes("риск") || value.includes("глоссар")) return "Риски / термины";
  if (value.includes("dao") || value.includes("swap") || value.includes("p2p") || value.includes("wallet") || value.includes("кошел")) return "Инфраструктура";
  if (value.includes("экосистем") || value.includes("roadmap") || value.includes("дорож")) return "Экосистема";
  return "Основа";
}

function normalizeBlock(block, index = 0) {
  return {
    id: block.id || `dataset-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    type: block.type || "Блок",
    title: block.title || "",
    source: block.source || "Atlas_System_final.pdf",
    pages: block.pages || "",
    prompt: block.prompt || "",
    response: block.response || block.sourceText || "",
    sourceText: block.sourceText || block.response || "",
    notes: block.notes || "",
    group: block.group || inferGroup(block),
    status: block.status || "Черновик",
    enabled: block.enabled !== false && block.status !== "Не включать",
  };
}

function hydrateDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.blocks)) return defaultTrainingDataset;

  const savedById = new Map(dataset.blocks.map((block, index) => [block.id || `saved-${index}`, normalizeBlock(block, index)]));
  const hydratedDefaults = defaultDatasetBlocks.map((defaultBlock, index) => {
    const savedBlock = savedById.get(defaultBlock.id);
    if (!savedBlock) return normalizeBlock(defaultBlock, index);

    return {
      ...normalizeBlock(defaultBlock, index),
      ...savedBlock,
      sourceText: savedBlock.sourceText || defaultBlock.sourceText,
      response: savedBlock.response || savedBlock.sourceText || defaultBlock.response,
    };
  });
  const customBlocks = dataset.blocks
    .filter((block) => !defaultDatasetBlocks.some((defaultBlock) => defaultBlock.id === block.id))
    .map(normalizeBlock);

  return {
    blocks: [...hydratedDefaults, ...customBlocks],
    fullText: dataset.fullText || atlasPdfFullText,
  };
}

function readStoredDataset() {
  if (typeof window === "undefined") return defaultTrainingDataset;

  try {
    const saved = window.localStorage.getItem(AGENT_TRAINING_DATASET_STORAGE_KEY);
    return saved ? hydrateDataset(JSON.parse(saved)) : defaultTrainingDataset;
  } catch {
    return defaultTrainingDataset;
  }
}

function persistDataset(dataset) {
  try {
    window.localStorage.setItem(AGENT_TRAINING_DATASET_STORAGE_KEY, JSON.stringify(dataset));
    saveServerContent(AGENT_TRAINING_DATASET_STORAGE_KEY, dataset);
  } catch {
    // Датасет останется доступен в состоянии страницы, даже если storage временно недоступен.
  }
}

function createBlock() {
  return normalizeBlock({
    id: `dataset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "Новый блок",
    title: "Новая запись датасета",
    source: "Atlas_System_final.pdf",
    pages: "",
    prompt: "",
    response: "",
    sourceText: "",
    notes: "",
    group: "Основа",
    status: "Черновик",
    enabled: true,
  });
}

function buildJsonl(blocks) {
  return blocks
    .filter((block) => block.enabled !== false && block.status !== "Не включать")
    .map((block) => JSON.stringify({
      type: block.type,
      title: block.title,
      source: block.source,
      pages: block.pages,
      group: block.group,
      status: block.status,
      source_text: block.sourceText,
      messages: [
        { role: "user", content: block.prompt },
        { role: "assistant", content: block.response },
      ],
      notes: block.notes,
    }))
    .join("\n");
}

function countCharacters(blocks) {
  return blocks.reduce((sum, block) => sum + (block.sourceText || "").length, 0);
}

function AgentTrainingDataset() {
  const [dataset, setDataset] = useState(readStoredDataset);
  const [activeBlockId, setActiveBlockId] = useState(() => {
    if (typeof window === "undefined") return defaultDatasetBlocks[0]?.id || "";
    const url = new URL(window.location.href);
    return url.searchParams.get("dataset") || defaultDatasetBlocks[0]?.id || "";
  });
  const [viewMode, setViewMode] = useState("source");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("Все группы");
  const [onlyEnabled, setOnlyEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(AGENT_TRAINING_DATASET_STORAGE_KEY).then((savedDataset) => {
      if (!isMounted || !savedDataset) return;
      setDataset(hydrateDataset(savedDataset));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateDataset(updater) {
    setDataset((current) => {
      const next = updater(current);
      persistDataset(next);
      return next;
    });
  }

  function updateBlock(blockId, field, value) {
    updateDataset((current) => ({
      ...current,
      blocks: current.blocks.map((block) => {
        if (block.id !== blockId) return block;
        const nextBlock = { ...block, [field]: value };
        if (field === "sourceText") {
          nextBlock.response = value;
        }
        if (field === "status" && value === "Не включать") {
          nextBlock.enabled = false;
        }
        if (field === "status" && value !== "Не включать" && block.enabled === false) {
          nextBlock.enabled = true;
        }
        return nextBlock;
      }),
    }));
  }

  function addBlock() {
    const block = createBlock();
    updateDataset((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setActiveBlockId(block.id);
  }

  function removeBlock(blockId) {
    updateDataset((current) => {
      const blocks = current.blocks.filter((block) => block.id !== blockId);
      return { ...current, blocks: blocks.length ? blocks : [createBlock()] };
    });
  }

  const activeBlock = dataset.blocks.find((block) => block.id === activeBlockId) || dataset.blocks[0] || null;
  const groups = useMemo(() => ["Все группы", ...Array.from(new Set(dataset.blocks.map((block) => block.group || inferGroup(block)))).sort((first, second) => first.localeCompare(second, "ru"))], [dataset.blocks]);
  const filteredBlocks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return dataset.blocks.filter((block) => {
      const matchesGroup = groupFilter === "Все группы" || (block.group || inferGroup(block)) === groupFilter;
      const matchesEnabled = !onlyEnabled || (block.enabled !== false && block.status !== "Не включать");
      const haystack = `${block.title} ${block.type} ${block.pages} ${block.sourceText} ${block.notes}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesGroup && matchesEnabled && matchesQuery;
    });
  }, [dataset.blocks, groupFilter, onlyEnabled, searchQuery]);
  const stats = useMemo(() => {
    const types = new Set(dataset.blocks.map((block) => block.type.trim()).filter(Boolean));
    const pdfBlocks = dataset.blocks.filter((block) => block.source === "Atlas_System_final.pdf").length;
    const enabledBlocks = dataset.blocks.filter((block) => block.enabled !== false && block.status !== "Не включать");
    const readyBlocks = dataset.blocks.filter((block) => block.status === "Готово").length;

    return [
      ["Блоков", dataset.blocks.length],
      ["В обучении", enabledBlocks.length],
      ["Готово", readyBlocks],
      ["PDF-блоков", pdfBlocks],
      ["Символов", countCharacters(enabledBlocks).toLocaleString("ru-RU")],
      ["Типов", types.size],
    ];
  }, [dataset.blocks]);
  const jsonl = useMemo(() => buildJsonl(dataset.blocks), [dataset.blocks]);

  useEffect(() => {
    if (!activeBlock || typeof window === "undefined") return;

    if (activeBlock.id !== activeBlockId) {
      setActiveBlockId(activeBlock.id);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("board", "agentDataset");
    url.searchParams.set("dataset", activeBlock.id);
    window.history.replaceState({}, "", url.toString());
  }, [activeBlock, activeBlockId]);

  if (!activeBlock) return null;

  return (
    <section className="analytics-surface analytics-agent-template analytics-agent-dataset">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Датасет агентов</span>
          <h2 className="analytics-agent-template-title">Atlas System: полный датасет из PDF</h2>
          <p className="analytics-page-subtitle">
            `Atlas_System_final.pdf` сохранён блоками без смысловых сокращений: каждый блок содержит полный извлечённый текст страниц, prompt/response пару и JSONL-экспорт.
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

      <div className="analytics-dataset-toolbar">
        <label>
          Поиск по датасету
          <input
            className="analytics-agent-template-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Партнерская, риск, BscScan..."
          />
        </label>
        <label>
          Группа
          <select className="analytics-agent-template-input" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            {groups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </label>
        <label className="analytics-dataset-toggle">
          <input type="checkbox" checked={onlyEnabled} onChange={(event) => setOnlyEnabled(event.target.checked)} />
          Только включённые
        </label>
      </div>

      <div className="analytics-agent-template-tabs analytics-dataset-tabs" role="tablist" aria-label="Блоки датасета">
        {filteredBlocks.map((block, index) => (
          <button
            key={block.id}
            type="button"
            role="tab"
            aria-selected={activeBlock.id === block.id}
            className={`analytics-agent-template-tab${activeBlock.id === block.id ? " analytics-agent-template-tab-active" : ""}${block.enabled === false || block.status === "Не включать" ? " analytics-dataset-tab-disabled" : ""}`}
            onClick={() => setActiveBlockId(block.id)}
          >
            <span>{dataset.blocks.findIndex((item) => item.id === block.id) + 1 || index + 1}</span>
            {block.title}
          </button>
        ))}
        {!filteredBlocks.length ? <p className="analytics-page-subtitle">По этому фильтру блоков нет.</p> : null}
      </div>

      <div className="analytics-dataset-mode" role="tablist" aria-label="Режим просмотра датасета">
        <button type="button" className={viewMode === "source" ? "is-active" : ""} onClick={() => setViewMode("source")}>
          Полный текст
        </button>
        <button type="button" className={viewMode === "pair" ? "is-active" : ""} onClick={() => setViewMode("pair")}>
          Prompt / response
        </button>
        <button type="button" className={viewMode === "jsonl" ? "is-active" : ""} onClick={() => setViewMode("jsonl")}>
          JSONL
        </button>
      </div>

      <div className="analytics-dataset-editor">
        <aside className="analytics-dataset-sidebar">
          <span className="analytics-kicker">Активный блок</span>
          <strong>{activeBlock.title}</strong>
          <small>{activeBlock.group || inferGroup(activeBlock)} · {activeBlock.type} · стр. {activeBlock.pages || "не указаны"}</small>
          <small>{activeBlock.status || "Черновик"} · {activeBlock.enabled === false || activeBlock.status === "Не включать" ? "не входит в JSONL" : "входит в JSONL"}</small>
          <small>{(activeBlock.sourceText || "").length.toLocaleString("ru-RU")} символов исходника</small>
        </aside>

        <div className="analytics-dataset-main">
          <div className="analytics-dataset-meta-row">
            <label className="analytics-dataset-include">
              <input
                type="checkbox"
                checked={activeBlock.enabled !== false && activeBlock.status !== "Не включать"}
                onChange={(event) => updateBlock(activeBlock.id, "enabled", event.target.checked)}
              />
              Включать в обучение / JSONL
            </label>
            <label>
              Статус
              <select className="analytics-agent-template-input" value={activeBlock.status || "Черновик"} onChange={(event) => updateBlock(activeBlock.id, "status", event.target.value)}>
                {DATASET_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Группа
              <input className="analytics-agent-template-input" value={activeBlock.group || inferGroup(activeBlock)} onChange={(event) => updateBlock(activeBlock.id, "group", event.target.value)} />
            </label>
          </div>

          <div className="analytics-program-grid">
            <label>
              Тип
              <input className="analytics-agent-template-input" value={activeBlock.type} onChange={(event) => updateBlock(activeBlock.id, "type", event.target.value)} />
            </label>
            <label>
              Страницы
              <input className="analytics-agent-template-input" value={activeBlock.pages} onChange={(event) => updateBlock(activeBlock.id, "pages", event.target.value)} />
            </label>
          </div>
          <div className="analytics-program-grid">
            <label>
              Название
              <input className="analytics-agent-template-input" value={activeBlock.title} onChange={(event) => updateBlock(activeBlock.id, "title", event.target.value)} />
            </label>
            <label>
              Источник
              <input className="analytics-agent-template-input" value={activeBlock.source} onChange={(event) => updateBlock(activeBlock.id, "source", event.target.value)} />
            </label>
          </div>

          {viewMode === "source" ? (
            <label className="analytics-program-field">
              Полный текст из PDF
              <textarea
                className="analytics-agent-template-input analytics-dataset-source"
                value={activeBlock.sourceText}
                onChange={(event) => updateBlock(activeBlock.id, "sourceText", event.target.value)}
                rows="22"
              />
            </label>
          ) : null}

          {viewMode === "pair" ? (
            <>
              <label className="analytics-program-field">
                Prompt
                <textarea className="analytics-agent-template-input" value={activeBlock.prompt} onChange={(event) => updateBlock(activeBlock.id, "prompt", event.target.value)} rows="4" />
              </label>
              <label className="analytics-program-field">
                Response / эталонный ответ
                <textarea className="analytics-agent-template-input analytics-dataset-source" value={activeBlock.response} onChange={(event) => updateBlock(activeBlock.id, "response", event.target.value)} rows="18" />
              </label>
              <label className="analytics-program-field">
                Заметки
                <textarea className="analytics-agent-template-input" value={activeBlock.notes} onChange={(event) => updateBlock(activeBlock.id, "notes", event.target.value)} rows="4" />
              </label>
            </>
          ) : null}

          {viewMode === "jsonl" ? (
            <label className="analytics-program-field">
              JSONL включённых блоков
              <textarea className="analytics-agent-template-input analytics-dataset-source" value={jsonl} readOnly rows="24" />
            </label>
          ) : null}

          <div className="analytics-program-danger">
            <AnalyticsActionButton variant="danger" size="sm" onClick={() => removeBlock(activeBlock.id)}>
              Удалить блок
            </AnalyticsActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AgentTrainingDataset;
