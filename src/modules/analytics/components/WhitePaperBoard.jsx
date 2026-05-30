import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { defaultWhitePaperBlocks } from "../data/whitePaperBlocks";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const WHITE_PAPER_STORAGE_KEY = "atlas.analytics.whitePaper.blocks.v8";

const BLOCK_STATUSES = ["Черновик", "На вычитке", "Готово", "Переписать"];
const WHITE_PAPER_VIEWS = [
  { id: "document", label: "Документ" },
  { id: "manifest", label: "Манифест" },
  { id: "archive", label: "Архив v6.4" },
];

function getBlockView(block) {
  if (block.view) return block.view;
  if (block.id === "full-manifest") return "manifest";
  if (block.id?.startsWith("archive-")) return "archive";
  return "document";
}

function normalizeBlock(block, index = 0) {
  return {
    id: block.id || `white-paper-${Date.now()}-${index}`,
    title: block.title || "Новый блок White Paper",
    sourceTitle: block.sourceTitle || block.title || "Новый блок White Paper",
    sectionNumber: block.sectionNumber || "",
    view: getBlockView(block),
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
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === "undefined") return "document";
    const url = new URL(window.location.href);
    const requestedView = url.searchParams.get("view");
    if (WHITE_PAPER_VIEWS.some((view) => view.id === requestedView)) return requestedView;
    if (url.searchParams.get("block") === "full-manifest") return "manifest";
    if (url.searchParams.get("block")?.startsWith("archive-")) return "archive";
    return "document";
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

  const visibleBlocks = useMemo(() => blocks.filter((block) => getBlockView(block) === activeView), [activeView, blocks]);
  const activeBlock = visibleBlocks.find((block) => block.id === activeBlockId) || visibleBlocks[0] || blocks[0];
  const stats = useMemo(() => {
    const ready = visibleBlocks.filter((block) => block.status === "Готово").length;
    const review = visibleBlocks.filter((block) => block.status === "На вычитке").length;
    const chars = visibleBlocks.reduce((sum, block) => sum + block.text.length, 0);
    return [
      ["Блоков", visibleBlocks.length],
      ["На вычитке", review],
      ["Готово", ready],
      ["Символов", chars.toLocaleString("ru-RU")],
    ];
  }, [visibleBlocks]);

  useEffect(() => {
    if (!activeBlock || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("board", "whitePaper");
    url.searchParams.set("view", activeView);
    url.searchParams.set("block", activeBlock.id);
    window.history.replaceState({}, "", url.toString());
  }, [activeBlock, activeView]);

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

  function switchView(viewId) {
    setActiveView(viewId);
    const firstBlock = blocks.find((block) => getBlockView(block) === viewId);
    if (firstBlock) setActiveBlockId(firstBlock.id);
  }

  function addBlock() {
    const defaultsByView = {
      document: { title: "Новый блок White Paper", role: "Рабочий раздел" },
      manifest: { title: "Новый блок манифеста", role: "Манифест" },
      archive: { title: "Новый блок архива v6.4", role: "Архив v6.4" },
    };
    const defaults = defaultsByView[activeView] || defaultsByView.document;
    const block = normalizeBlock({
      id: `white-paper-${Date.now()}`,
      title: defaults.title,
      role: defaults.role,
      view: activeView,
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
          <h2 className="analytics-agent-template-title">White Paper: публичная версия</h2>
          <p className="analytics-page-subtitle mb-0">
            Чистая версия для чтения и сверки. Большая старая редакция v6.4 вынесена отдельно, чтобы можно было спокойно вычитывать и переносить сильные блоки.
          </p>
        </div>
        <div className="analytics-agent-template-review-actions">
          <div className="analytics-agent-template-review-filter" aria-label="Раздел White Paper">
            {WHITE_PAPER_VIEWS.map((view) => (
              <button key={view.id} type="button" className={activeView === view.id ? "is-active" : ""} onClick={() => switchView(view.id)}>
                {view.label}
              </button>
            ))}
          </div>
          <AnalyticsActionButton variant="primary" size="sm" onClick={addBlock}>
            + блок
          </AnalyticsActionButton>
        </div>
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
          {visibleBlocks.map((block) => (
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
