import { useEffect, useMemo, useRef, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { WhitePaperCoverPreview, WhitePaperLegalPreview } from "./WhitePaperPreviews";
import { WhitePaperReadableText } from "./WhitePaperReadableContent";
import { defaultWhitePaperBlocks } from "../data/whitePaperBlocks";
import { CONTENT_FORMAT_OPTIONS, WHITE_PAPER_STORAGE_KEY, WHITE_PAPER_VIEWS } from "../data/whitePaperData";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import {
  getBlockView,
  getWhitePaperSubsections,
  hasStoredBlocks,
  isEditableKeyboardTarget,
  mergeDefaultBlocks,
  normalizeBlock,
  persistBlocksLocal,
  readStoredBlocks,
  replaceWhitePaperSubsectionText,
} from "../utils/whitePaperUtils";

function WhitePaperBoard() {
  const [blocks, setBlocks] = useState(readStoredBlocks);
  const [saveState, setSaveState] = useState({ status: "idle", message: "Сервер не синхронизирован" });
  const saveTimerRef = useRef(null);
  const latestBlocksRef = useRef(blocks);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const saveVersionRef = useRef(0);
  const readableEditorRef = useRef(null);
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
  const [documentMode, setDocumentMode] = useState("read");
  const [readTheme, setReadTheme] = useState("light");
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

  useEffect(() => {
    if (documentMode !== "edit") return undefined;

    const focusTimer = window.setTimeout(() => {
      const editor = readableEditorRef.current;
      if (!editor) return;
      editor.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [activeBlock?.id, activeSubsectionId, documentMode]);

  useEffect(() => {
    if (documentMode !== "edit" || typeof window === "undefined") return undefined;

    function stopPageSpaceScroll(event) {
      if (event.key !== " " && event.code !== "Space") return;
      if (isEditableKeyboardTarget(event.target)) return;

      const editor = readableEditorRef.current;
      if (!editor) return;

      event.preventDefault();
      event.stopPropagation();
      editor.focus();
    }

    window.addEventListener("keydown", stopPageSpaceScroll, true);
    window.addEventListener("keyup", stopPageSpaceScroll, true);

    return () => {
      window.removeEventListener("keydown", stopPageSpaceScroll, true);
      window.removeEventListener("keyup", stopPageSpaceScroll, true);
    };
  }, [documentMode]);

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

  function insertReadableTextAtCursor(insertText) {
    const editor = readableEditorRef.current;
    if (!editor) return;

    const start = editor.selectionStart ?? activeReadableText.length;
    const end = editor.selectionEnd ?? activeReadableText.length;
    const nextText = `${activeReadableText.slice(0, start)}${insertText}${activeReadableText.slice(end)}`;
    const nextCursor = start + insertText.length;

    updateReadableText(nextText);

    window.requestAnimationFrame(() => {
      const nextEditor = readableEditorRef.current;
      if (!nextEditor) return;
      nextEditor.focus();
      nextEditor.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleReadableEditorKeyDown(event) {
    event.stopPropagation();

    if (event.key !== " " && event.code !== "Space") return;

    event.preventDefault();
    insertReadableTextAtCursor(" ");
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
      whitepaper50SmartCycle: { title: "Новый блок пункта 4", role: "Альтернативная структура" },
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

      <div className={`analytics-dataset-editor${documentMode === "read" ? " analytics-whitepaper-read-layout" : ""}`}>
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

        <div className={`analytics-dataset-main analytics-whitepaper-main-theme-${readTheme}`}>
          <div className="analytics-whitepaper-control-panel">
            <div>
              <span>Режим работы</span>
              <div className="analytics-whitepaper-mode-toggle" aria-label="Режим White Paper">
                <button type="button" className={documentMode === "read" ? "is-active" : ""} onClick={() => setDocumentMode("read")}>Читать</button>
                <button type="button" className={documentMode === "edit" ? "is-active" : ""} onClick={() => setDocumentMode("edit")}>Редактировать</button>
              </div>
            </div>
            <div>
              <span>Тема текста</span>
              <div className="analytics-whitepaper-mode-toggle" aria-label="Тема текста White Paper">
                <button type="button" className={readTheme === "light" ? "is-active" : ""} onClick={() => setReadTheme("light")}>Белая</button>
                <button type="button" className={readTheme === "dark" ? "is-active" : ""} onClick={() => setReadTheme("dark")}>Чёрная</button>
              </div>
            </div>
          </div>

          {isStructuredWhitePaper ? (
            <section className={`analytics-whitepaper-reader analytics-whitepaper-reader-${documentMode} analytics-whitepaper-reader-theme-${readTheme}`}>
              <div className="analytics-whitepaper-reader-head">
                <span>{activeSubsection ? activeSubsection.number : activeBlock.sectionNumber || "Блок"}</span>
                <div>
                  <strong>{activeSubsection ? activeSubsection.title : activeBlock.title}</strong>
                  <small>{documentMode === "read" ? "Режим чтения" : activeSubsection ? `${activeBlock.title} · редактируется только выбранный подпункт` : "Полный текст выбранного блока"}</small>
                </div>
              </div>
              {documentMode === "read" ? (
                <WhitePaperReadableText text={activeReadableText} />
              ) : (
                <label className="analytics-whitepaper-reader-editor">
                  <span>{activeSubsection ? "Редактировать подблок" : "Редактировать блок"}</span>
                  <textarea
                    ref={readableEditorRef}
                    className="analytics-agent-template-input analytics-whitepaper-reader-input"
                    value={activeReadableText}
                    onChange={(event) => updateReadableText(event.target.value)}
                    onKeyDown={handleReadableEditorKeyDown}
                    onKeyUp={(event) => {
                      if (event.key === " " || event.code === "Space") {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                    }}
                    rows={activeSubsection ? 12 : 16}
                  />
                </label>
              )}
            </section>
          ) : null}

          <div className="analytics-whitepaper-editor-fields">
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
      </div>
    </section>
  );
}

export default WhitePaperBoard;
