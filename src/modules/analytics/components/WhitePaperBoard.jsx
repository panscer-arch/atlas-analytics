import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { defaultWhitePaperBlocks } from "../data/whitePaperBlocks";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const WHITE_PAPER_STORAGE_KEY = "atlas.analytics.whitePaper.blocks.v4";

const BLOCK_STATUSES = ["Черновик", "На вычитке", "Готово", "Переписать"];

function normalizeBlock(block, index = 0) {
  return {
    id: block.id || `white-paper-${Date.now()}-${index}`,
    title: block.title || "Новый блок White Paper",
    sourceTitle: block.sourceTitle || block.title || "Новый блок White Paper",
    sectionNumber: block.sectionNumber || "",
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

function hasStoredBlocks() {
  if (typeof window === "undefined") return false;

  try {
    return Boolean(window.localStorage.getItem(WHITE_PAPER_STORAGE_KEY));
  } catch {
    return false;
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
      if (isMounted && !Array.isArray(savedBlocks) && !hasStoredBlocks()) persistBlocks(defaultWhitePaperBlocks);
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
