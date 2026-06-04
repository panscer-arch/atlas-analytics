import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { defaultWhitePaperBlocks } from "../data/whitePaperBlocks";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const WHITE_PAPER_STORAGE_KEY = "atlas.analytics.whitePaper.blocks.v8";

const BLOCK_STATUSES = ["Согласовать", "Черновик", "На вычитке", "Готово", "Переписать"];
const WHITE_PAPER_VIEWS = [
  { id: "document", label: "Документ" },
  { id: "whitepaper20", label: "WhitePaper 2.0" },
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

function mergeDefaultBlocks(savedBlocks = []) {
  const defaultBlocksById = new Map(defaultWhitePaperBlocks.map((block) => [block.id, normalizeBlock(block)]));
  const defaultOrderById = new Map(defaultWhitePaperBlocks.map((block, index) => [block.id, index]));
  const normalizedSavedBlocks = savedBlocks.map((block) => {
    const normalizedBlock = normalizeBlock(block);
    const defaultBlock = defaultBlocksById.get(normalizedBlock.id);
    if (!defaultBlock) return normalizedBlock;
    if (normalizedBlock.id.startsWith("wp20-")) {
      return {
        ...normalizedBlock,
        title: defaultBlock.title,
        sourceTitle: defaultBlock.sourceTitle,
        sectionNumber: defaultBlock.sectionNumber,
        view: defaultBlock.view,
        role: defaultBlock.role,
        text: normalizedBlock.text || defaultBlock.text,
        notes: defaultBlock.notes || normalizedBlock.notes,
      };
    }
    return {
      ...normalizedBlock,
      text: normalizedBlock.text || defaultBlock.text,
      notes: normalizedBlock.notes || defaultBlock.notes,
    };
  });
  const savedIds = new Set(normalizedSavedBlocks.map((block) => block.id));
  const missingDefaults = defaultWhitePaperBlocks
    .filter((block) => !savedIds.has(block.id))
    .map(normalizeBlock);
  return [...normalizedSavedBlocks, ...missingDefaults].sort((a, b) => {
    const aOrder = defaultOrderById.has(a.id) ? defaultOrderById.get(a.id) : Number.POSITIVE_INFINITY;
    const bOrder = defaultOrderById.has(b.id) ? defaultOrderById.get(b.id) : Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

function readStoredBlocks() {
  if (typeof window === "undefined") return defaultWhitePaperBlocks;

  try {
    const saved = window.localStorage.getItem(WHITE_PAPER_STORAGE_KEY);
    return saved ? mergeDefaultBlocks(JSON.parse(saved)) : defaultWhitePaperBlocks;
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

function getWhitePaperCoverLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findCoverValue(lines, label) {
  const prefix = `${label}:`;
  return lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() || "";
}

function WhitePaperCoverPreview({ block }) {
  const lines = getWhitePaperCoverLines(block.text);
  const title = lines[0] || "Atlas System White Paper";
  const subtitle = lines[1] || "Web3 Mutual Support Protocol with DAO-Inspired Mechanics";
  const version = findCoverValue(lines, "Version") || "0.1";
  const status = findCoverValue(lines, "Status") || "Working Draft for Review";
  const date = findCoverValue(lines, "Date") || "June 2026";
  const network = findCoverValue(lines, "Primary Network") || "BNB Smart Chain";
  const website = findCoverValue(lines, "Official Website") || "https://atlas-system.io";
  const telegram = findCoverValue(lines, "Official Telegram Channel") || "@atlas_system_official";
  const community = findCoverValue(lines, "Official Telegram Community") || "@atlas_system_global_community";
  const xLink = findCoverValue(lines, "Official X") || "https://x.com/AtlasSystemWeb3";
  const registry = findCoverValue(lines, "Contract Registry") || "To be confirmed before public release";
  const repository = findCoverValue(lines, "Technical Repository") || "To be confirmed before public release";
  const docs = findCoverValue(lines, "Documentation Hub") || "To be confirmed before public release";

  return (
    <section className="analytics-whitepaper-cover-preview" aria-label="Предпросмотр обложки White Paper">
      <div className="analytics-whitepaper-cover-grid" aria-hidden="true" />
      <div className="analytics-whitepaper-cover-mark" aria-hidden="true" />
      <div className="analytics-whitepaper-cover-orbit" aria-hidden="true">
        <img src="/generated/atlas-network-reference.png" alt="" />
      </div>

      <div className="analytics-whitepaper-cover-header">
        <img src="/generated/atlas-logo-new-transparent.png" alt="Atlas System" />
        <div>
          <span>White Paper</span>
          <strong>{status}</strong>
        </div>
      </div>

      <div className="analytics-whitepaper-cover-body">
        <div className="analytics-whitepaper-cover-copy">
          <span className="analytics-whitepaper-cover-kicker">Atlas System</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
          <div className="analytics-whitepaper-cover-tags">
            <span>Smart Cycle</span>
            <span>Referral Layer</span>
            <span>Risk Disclosure</span>
            <span>DAO-inspired Mechanics</span>
          </div>
        </div>

        <div className="analytics-whitepaper-cover-card">
          <dl>
            <div>
              <dt>Version</dt>
              <dd>{version}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{network}</dd>
            </div>
            <div>
              <dt>Registry</dt>
              <dd>{registry}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="analytics-whitepaper-cover-footer">
        <div>
          <span>Official Links</span>
          <strong>{website}</strong>
        </div>
        <div>
          <span>Telegram</span>
          <strong>{telegram}</strong>
        </div>
        <div>
          <span>Community</span>
          <strong>{community}</strong>
        </div>
        <div>
          <span>X</span>
          <strong>{xLink}</strong>
        </div>
        <div>
          <span>Docs</span>
          <strong>{docs}</strong>
        </div>
        <div>
          <span>Repository</span>
          <strong>{repository}</strong>
        </div>
      </div>
    </section>
  );
}

function WhitePaperLegalPreview({ block }) {
  const lines = getWhitePaperCoverLines(block.text);
  const title = lines[0] || "Legal Notice and Reader Guide";
  const paragraphs = String(block.text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(1);
  const lead = paragraphs[0] || "This White Paper is provided for informational and technical review purposes only.";
  const coreItems = [
    "Not a token sale, ICO, prospectus or guaranteed-return document.",
    "Not financial, investment, legal, tax, accounting or regulatory advice.",
    "On-chain actions must be verified and confirmed by the participant's own wallet.",
    "Official website, contract registry and latest published version remain the source of truth.",
  ];

  return (
    <section className="analytics-whitepaper-page-preview analytics-whitepaper-legal-preview" aria-label="Предпросмотр Legal Notice">
      <div className="analytics-whitepaper-page-watermark" aria-hidden="true">02</div>
      <div className="analytics-whitepaper-page-header">
        <img src="/generated/atlas-logo-new-transparent.png" alt="Atlas System" />
        <span>Atlas System White Paper</span>
      </div>

      <div className="analytics-whitepaper-page-title">
        <span>Legal Notice</span>
        <h3>{title}</h3>
        <p>{lead}</p>
      </div>

      <div className="analytics-whitepaper-legal-grid">
        {coreItems.map((item, index) => (
          <div key={item} className="analytics-whitepaper-legal-card">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>

      <div className="analytics-whitepaper-reader-guide">
        <div>
          <span>Read This As</span>
          <strong>Technical and informational disclosure</strong>
        </div>
        <div>
          <span>Do Not Read This As</span>
          <strong>Investment promise, token sale or guarantee</strong>
        </div>
        <div>
          <span>Verify Before Action</span>
          <strong>Network, contract address, transaction details and current version</strong>
        </div>
      </div>
    </section>
  );
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
      if (isMounted && Array.isArray(savedBlocks)) {
        const mergedBlocks = mergeDefaultBlocks(savedBlocks);
        setBlocks(mergedBlocks);
        if (JSON.stringify(mergedBlocks) !== JSON.stringify(savedBlocks.map(normalizeBlock))) persistBlocks(mergedBlocks);
      }
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
      whitepaper20: { title: "Новый блок WhitePaper 2.0", role: "Структурный раздел" },
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
    <section className="analytics-surface analytics-agent-template analytics-agent-dataset">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">White Paper</span>
          <h2 className="analytics-agent-template-title">White Paper: публичная версия</h2>
          <p className="analytics-page-subtitle">
            Чистая версия для чтения и сверки. В WhitePaper 2.0 собираем новую структуру без наполнения: сначала согласуем каркас, затем будем заполнять блоки постепенно.
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

          {activeBlock.id === "wp20-cover-metadata" ? (
            <div className="analytics-program-field">
              <span className="analytics-whitepaper-preview-label">Предпросмотр первой страницы</span>
              <WhitePaperCoverPreview block={activeBlock} />
            </div>
          ) : null}

          {activeBlock.id === "wp20-legal-disclaimer" ? (
            <div className="analytics-program-field">
              <span className="analytics-whitepaper-preview-label">Предпросмотр второй страницы</span>
              <WhitePaperLegalPreview block={activeBlock} />
            </div>
          ) : null}

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
