import { useEffect, useMemo, useRef, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { defaultWhitePaperBlocks } from "../data/whitePaperBlocks";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const WHITE_PAPER_STORAGE_KEY = "atlas.analytics.whitePaper.blocks.v8";

const CONTENT_FORMAT_OPTIONS = [
  { id: "text", label: "Только текст" },
  { id: "tables", label: "Можно использовать таблицы" },
  { id: "charts", label: "Можно использовать графики и таблицы" },
];
const WHITE_PAPER_VIEWS = [
  { id: "document", label: "Документ" },
  { id: "whitepaper20", label: "WhitePaper 2.0" },
  { id: "whitepaper30", label: "White Paper 3.0" },
  { id: "whitepaper40", label: "White Paper 4.0" },
  { id: "whitepaper50", label: "White Paper 5.0" },
  { id: "aaveRu", label: "Aave RU" },
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
    prompt: block.prompt || "",
    contentFormat: block.contentFormat || "text",
  };
}

function mergeDefaultBlocks(savedBlocks = []) {
  const defaultBlocksById = new Map(defaultWhitePaperBlocks.map((block) => [block.id, normalizeBlock(block)]));
  const defaultOrderById = new Map(defaultWhitePaperBlocks.map((block, index) => [block.id, index]));
  const normalizedSavedBlocks = savedBlocks.map((block) => {
    const normalizedBlock = normalizeBlock(block);
    const defaultBlock = defaultBlocksById.get(normalizedBlock.id);
    if (!defaultBlock) return normalizedBlock;
    if (normalizedBlock.id.startsWith("wp20-") || normalizedBlock.id.startsWith("wp30-") || normalizedBlock.id.startsWith("wp40-") || normalizedBlock.id.startsWith("wp50-") || normalizedBlock.id.startsWith("aave-")) {
      return {
        ...normalizedBlock,
        title: normalizedBlock.title || defaultBlock.title,
        sourceTitle: normalizedBlock.sourceTitle || defaultBlock.sourceTitle,
        sectionNumber: defaultBlock.sectionNumber,
        view: defaultBlock.view,
        role: normalizedBlock.role || defaultBlock.role,
        text: normalizedBlock.text || defaultBlock.text,
        notes: normalizedBlock.notes || defaultBlock.notes,
        prompt: normalizedBlock.prompt || defaultBlock.prompt,
        contentFormat: normalizedBlock.contentFormat || defaultBlock.contentFormat,
      };
    }
    return {
      ...normalizedBlock,
      text: normalizedBlock.text || defaultBlock.text,
      notes: normalizedBlock.notes || defaultBlock.notes,
      prompt: normalizedBlock.prompt || defaultBlock.prompt,
      contentFormat: normalizedBlock.contentFormat || defaultBlock.contentFormat,
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

function persistBlocksLocal(blocks) {
  try {
    window.localStorage.setItem(WHITE_PAPER_STORAGE_KEY, JSON.stringify(blocks));
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

function findFirstCoverValue(lines, labels) {
  return labels.map((label) => findCoverValue(lines, label)).find(Boolean) || "";
}

function getWhitePaperSubsections(block) {
  const lines = String(block?.text || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+\.\d+)\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = {
        id: `${block.id}-${match[1].replace(/\./g, "-")}`,
        number: match[1],
        title: match[2],
        lines: [trimmed],
      };
      return;
    }

    if (current) current.lines.push(line);
  });

  if (current) sections.push(current);

  return sections.map((section) => ({
    id: section.id,
    number: section.number,
    title: section.title,
    text: section.lines.join("\n").trim(),
  }));
}

function replaceWhitePaperSubsectionText(blockText = "", subsection, nextText = "") {
  if (!subsection?.number) return nextText;

  const lines = String(blockText || "").split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim().match(new RegExp(`^${subsection.number.replace(".", "\\.")}\\s+`)));
  if (startIndex === -1) return blockText;

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^\d+\.\d+\s+/.test(lines[index].trim())) {
      endIndex = index;
      break;
    }
  }

  const nextLines = String(nextText || "").split(/\r?\n/);
  return [...lines.slice(0, startIndex), ...nextLines, ...lines.slice(endIndex)].join("\n");
}

function WhitePaperCoverPreview({ block }) {
  const lines = getWhitePaperCoverLines(block.text);
  const title = lines[0] || "Atlas System White Paper";
  const subtitle = lines[1] || "Web3-протокол взаимной поддержки с DAO-inspired механиками";
  const version = findFirstCoverValue(lines, ["Версия", "Version"]) || "0.1";
  const status = findFirstCoverValue(lines, ["Статус", "Status"]) || "рабочая версия для вычитки";
  const date = findFirstCoverValue(lines, ["Дата", "Date"]) || "июнь 2026";
  const network = findFirstCoverValue(lines, ["Основная сеть", "Primary Network"]) || "BNB Smart Chain";
  const website = findFirstCoverValue(lines, ["Официальный сайт", "Official Website"]) || "https://atlas-system.io";
  const telegram = findFirstCoverValue(lines, ["Официальный Telegram-канал", "Official Telegram Channel"]) || "@atlas_system_official";
  const community = findFirstCoverValue(lines, ["Официальное Telegram-сообщество", "Official Telegram Community"]) || "@atlas_system_global_community";
  const xLink = findFirstCoverValue(lines, ["Официальный X", "Official X"]) || "https://x.com/AtlasSystemWeb3";
  const registry = findFirstCoverValue(lines, ["Реестр смарт-контрактов", "Contract Registry"]) || "будет подтвержден перед публичным релизом";
  const repository = findFirstCoverValue(lines, ["Технический репозиторий", "Technical Repository"]) || "будет подтвержден перед публичным релизом";
  const docs = findFirstCoverValue(lines, ["Центр документации", "Documentation Hub"]) || "будет подтвержден перед публичным релизом";

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
            <span>Партнерский слой</span>
            <span>Раскрытие рисков</span>
            <span>DAO-inspired механики</span>
          </div>
        </div>

        <div className="analytics-whitepaper-cover-card">
          <dl>
            <div>
              <dt>Версия</dt>
              <dd>{version}</dd>
            </div>
            <div>
              <dt>Дата</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>Сеть</dt>
              <dd>{network}</dd>
            </div>
            <div>
              <dt>Реестр</dt>
              <dd>{registry}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="analytics-whitepaper-cover-footer">
        <div>
          <span>Официальный сайт</span>
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
          <span>Документация</span>
          <strong>{docs}</strong>
        </div>
        <div>
          <span>Репозиторий</span>
          <strong>{repository}</strong>
        </div>
      </div>
    </section>
  );
}

function WhitePaperLegalPreview({ block }) {
  const lines = getWhitePaperCoverLines(block.text);
  const title = lines[0] || "Юридическое уведомление и как читать документ";
  const paragraphs = String(block.text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(1);
  const lead = paragraphs[0] || "Этот White Paper подготовлен для информационной, технической и редакционной вычитки.";
  const coreItems = [
    "Не является токенсейлом, ICO, проспектом или документом с гарантированной доходностью.",
    "Не является финансовой, инвестиционной, юридической, налоговой или регуляторной рекомендацией.",
    "Любые on-chain действия проверяются и подтверждаются участником через собственный кошелек.",
    "Официальный сайт, реестр контрактов и последняя опубликованная версия остаются источником истины.",
  ];

  return (
    <section className="analytics-whitepaper-page-preview analytics-whitepaper-legal-preview" aria-label="Предпросмотр Legal Notice">
      <div className="analytics-whitepaper-page-watermark" aria-hidden="true">02</div>
      <div className="analytics-whitepaper-page-header">
        <img src="/generated/atlas-logo-new-transparent.png" alt="Atlas System" />
        <span>Atlas System White Paper</span>
      </div>

      <div className="analytics-whitepaper-page-title">
        <span>Юридическая рамка</span>
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
          <span>Как читать</span>
          <strong>Техническое и информационное раскрытие</strong>
        </div>
        <div>
          <span>Как не читать</span>
          <strong>Инвестиционное обещание, токенсейл или гарантию</strong>
        </div>
        <div>
          <span>Проверить перед действием</span>
          <strong>Сеть, адрес контракта, параметры транзакции и текущую версию</strong>
        </div>
      </div>
    </section>
  );
}

function WhitePaperBoard() {
  const [blocks, setBlocks] = useState(readStoredBlocks);
  const [saveState, setSaveState] = useState({ status: "idle", message: "Сервер не синхронизирован" });
  const saveTimerRef = useRef(null);
  const latestBlocksRef = useRef(blocks);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const saveVersionRef = useRef(0);
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
  const [activeSubsectionId, setActiveSubsectionId] = useState(() => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    return url.searchParams.get("subblock") || "";
  });
  const [expandedBlockIds, setExpandedBlockIds] = useState(() => new Set());

  useEffect(() => {
    let isMounted = true;

    loadServerContent(WHITE_PAPER_STORAGE_KEY).then((savedBlocks) => {
      if (isMounted && Array.isArray(savedBlocks)) {
        const mergedBlocks = mergeDefaultBlocks(savedBlocks);
        setBlocks(mergedBlocks);
        latestBlocksRef.current = mergedBlocks;
        persistBlocksLocal(mergedBlocks);
        setSaveState({ status: "saved", message: "Серверная версия загружена" });
        if (JSON.stringify(mergedBlocks) !== JSON.stringify(savedBlocks.map(normalizeBlock))) scheduleServerSave(mergedBlocks, { immediate: true });
      }
      if (isMounted && !Array.isArray(savedBlocks) && !hasStoredBlocks()) {
        latestBlocksRef.current = defaultWhitePaperBlocks;
        persistBlocksLocal(defaultWhitePaperBlocks);
        scheduleServerSave(defaultWhitePaperBlocks, { immediate: true });
      }
    });

    return () => {
      isMounted = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const visibleBlocks = useMemo(() => blocks.filter((block) => getBlockView(block) === activeView), [activeView, blocks]);
  const activeBlock = visibleBlocks.find((block) => block.id === activeBlockId) || visibleBlocks[0] || blocks[0];
  const isStructuredWhitePaper = true;
  const activeSubsections = useMemo(() => getWhitePaperSubsections(activeBlock), [activeBlock]);
  const activeSubsection = activeSubsections.find((section) => section.id === activeSubsectionId) || null;
  const activeReadableText = activeSubsection?.text || activeBlock?.text || "";
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
    if (activeSubsection) {
      url.searchParams.set("subblock", activeSubsection.id);
    } else {
      url.searchParams.delete("subblock");
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeBlock, activeSubsection, activeView]);

  useEffect(() => {
    if (!activeBlock || !isStructuredWhitePaper) return;
    setExpandedBlockIds((current) => {
      if (current.has(activeBlock.id)) return current;
      const next = new Set(current);
      next.add(activeBlock.id);
      return next;
    });
  }, [activeBlock, isStructuredWhitePaper]);

  useEffect(() => {
    if (!isStructuredWhitePaper || !activeSubsectionId) return;
    if (activeSubsections.some((section) => section.id === activeSubsectionId)) return;
    setActiveSubsectionId("");
  }, [activeSubsectionId, activeSubsections, isStructuredWhitePaper]);

  useEffect(() => {
    if (!isStructuredWhitePaper || activeSubsectionId || !activeSubsections.length) return;
    setActiveSubsectionId(activeSubsections[0].id);
  }, [activeSubsectionId, activeSubsections, isStructuredWhitePaper]);

  async function flushServerSave() {
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    saveQueuedRef.current = false;
    const version = saveVersionRef.current;
    const blocksToSave = latestBlocksRef.current;
    setSaveState({ status: "saving", message: "Сохраняю на сервер..." });

    const ok = await saveServerContent(WHITE_PAPER_STORAGE_KEY, blocksToSave);

    saveInFlightRef.current = false;

    if (saveQueuedRef.current || saveVersionRef.current !== version) {
      flushServerSave();
      return;
    }

    setSaveState(ok
      ? { status: "saved", message: "Сохранено на сервере" }
      : { status: "error", message: "Не удалось сохранить на сервер" });
  }

  function scheduleServerSave(nextBlocks, options = {}) {
    latestBlocksRef.current = nextBlocks;
    saveVersionRef.current += 1;
    setSaveState({ status: "saving", message: "Ожидает сохранения..." });

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    const delay = options.immediate ? 0 : 500;
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushServerSave();
    }, delay);
  }

  function updateBlocks(updater) {
    setBlocks((current) => {
      const next = updater(current);
      persistBlocksLocal(next);
      scheduleServerSave(next);
      return next;
    });
  }

  function updateBlock(blockId, patch) {
    updateBlocks((current) => current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)));
  }

  function updateReadableText(nextText) {
    if (!activeBlock) return;
    if (!activeSubsection) {
      updateBlock(activeBlock.id, { text: nextText });
      return;
    }

    updateBlock(activeBlock.id, {
      text: replaceWhitePaperSubsectionText(activeBlock.text, activeSubsection, nextText),
    });
  }

  function switchView(viewId) {
    setActiveView(viewId);
    const firstBlock = blocks.find((block) => getBlockView(block) === viewId);
    if (firstBlock) {
      setActiveBlockId(firstBlock.id);
      const firstSubsection = getWhitePaperSubsections(firstBlock)[0];
      setActiveSubsectionId(firstSubsection?.id || "");
    }
  }

  function selectBlock(blockId) {
    const block = blocks.find((item) => item.id === blockId);
    const firstSubsection = getWhitePaperSubsections(block)[0];
    setActiveBlockId(blockId);
    setActiveSubsectionId(firstSubsection?.id || "");
    setExpandedBlockIds((current) => {
      const next = new Set(current);
      next.add(blockId);
      return next;
    });
  }

  function toggleBlock(blockId) {
    setExpandedBlockIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }

  function selectSubsection(blockId, subsectionId) {
    setActiveBlockId(blockId);
    setActiveSubsectionId(subsectionId);
    setExpandedBlockIds((current) => {
      const next = new Set(current);
      next.add(blockId);
      return next;
    });
  }

  function addBlock() {
    const defaultsByView = {
      document: { title: "Новый блок White Paper", role: "Рабочий раздел" },
      whitepaper20: { title: "Новый блок WhitePaper 2.0", role: "Структурный раздел" },
      whitepaper30: { title: "Новый блок White Paper 3.0", role: "Структурный раздел" },
      whitepaper40: { title: "Новый блок White Paper 4.0", role: "Структурный раздел" },
      whitepaper50: { title: "Новый блок White Paper 5.0", role: "Структурный раздел" },
      aaveRu: { title: "Новый блок Aave RU", role: "Учебный перевод" },
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
            Чистая версия для чтения и сверки. В WhitePaper 2.0 и White Paper 3.0 собираем новые структуры: сначала согласуем каркас, затем будем заполнять блоки постепенно.
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
          <span className={`analytics-whitepaper-save analytics-whitepaper-save-${saveState.status}`} role="status">
            {saveState.message}
          </span>
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
          {visibleBlocks.map((block) => {
            const subsections = isStructuredWhitePaper ? getWhitePaperSubsections(block) : [];
            const isExpanded = expandedBlockIds.has(block.id);
            const isActiveBlock = activeBlock.id === block.id;

            return (
              <div key={block.id} className="analytics-whitepaper-tree-item">
                <div className="analytics-whitepaper-tree-row">
                  {isStructuredWhitePaper && subsections.length ? (
                    <button
                      type="button"
                      className={`analytics-whitepaper-tree-toggle${isExpanded ? " is-expanded" : ""}`}
                      onClick={() => toggleBlock(block.id)}
                      aria-label={isExpanded ? "Свернуть подблоки" : "Раскрыть подблоки"}
                    >
                      ›
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`analytics-agent-template-tab analytics-whitepaper-tree-block${isActiveBlock && !activeSubsection ? " analytics-agent-template-tab-active" : ""}`}
                    onClick={() => selectBlock(block.id)}
                  >
                    <span className="analytics-whitepaper-tree-block-number">{block.sectionNumber || "•"}</span>
                    <span className="analytics-whitepaper-tree-block-title">{block.title.replace(/^\d+\.\s*/, "")}</span>
                  </button>
                </div>

                {isStructuredWhitePaper && isExpanded && subsections.length ? (
                  <div className="analytics-whitepaper-subtree">
                    {subsections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        className={`analytics-whitepaper-subtree-button${activeSubsection?.id === section.id ? " is-active" : ""}`}
                        onClick={() => selectSubsection(block.id, section.id)}
                      >
                        <span>{section.number}</span>
                        <strong>{section.title}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </aside>

        <div className="analytics-dataset-main">
          {isStructuredWhitePaper ? (
            <section className="analytics-whitepaper-reader">
              <div className="analytics-whitepaper-reader-head">
                <span>{activeSubsection ? activeSubsection.number : activeBlock.sectionNumber || "Блок"}</span>
                <div>
                  <strong>{activeSubsection ? activeSubsection.title : activeBlock.title}</strong>
                  <small>{activeSubsection ? `${activeBlock.title} · редактируется только выбранный подпункт` : "Полный текст выбранного блока"}</small>
                </div>
              </div>
              <label className="analytics-whitepaper-reader-editor">
                <span>{activeSubsection ? "Редактировать подблок" : "Редактировать блок"}</span>
                <textarea
                  className="analytics-agent-template-input analytics-whitepaper-reader-input"
                  value={activeReadableText}
                  onChange={(event) => updateReadableText(event.target.value)}
                  rows={activeSubsection ? 12 : 16}
                />
              </label>
            </section>
          ) : null}

          <label className="analytics-program-field">
            Название
            <input className="analytics-agent-template-input" value={activeBlock.title} onChange={(event) => updateBlock(activeBlock.id, { title: event.target.value })} />
          </label>

          <div className="analytics-dataset-meta-row">
            <label>
              Формат подачи
              <select
                className="analytics-agent-template-input"
                value={activeBlock.contentFormat || "text"}
                onChange={(event) => updateBlock(activeBlock.id, { contentFormat: event.target.value })}
              >
                {CONTENT_FORMAT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="analytics-program-field">
            Промпт для генерации блока
            <textarea
              className="analytics-agent-template-input"
              value={activeBlock.prompt || ""}
              onChange={(event) => updateBlock(activeBlock.id, { prompt: event.target.value })}
              rows="6"
              placeholder="Опишите, на основе чего потом генерировать актуальный текст: смысл блока, тональность, факты, ограничения, что нельзя обещать."
            />
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
