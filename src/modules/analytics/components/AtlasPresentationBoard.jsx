import { useEffect, useMemo, useState } from "react";
import { loadServerContent } from "../services/contentStore";

import {
  PARTNER_STATUS_TABLE_ROWS,
  PRESENTATION_FRAME_DRAFTS_STORAGE_KEY,
  PRESENTATION_PREVIEW_MODES,
  PRESENTATION_SCRIPT_DRAFTS_STORAGE_KEY,
  PRESENTATION_SLIDES,
  PRESENTATION_VISUAL_DRAFTS_STORAGE_KEY,
  SMART_CYCLE_TARIFFS,
} from "../data/presentationData";
import {
  buildFrameDraftSvg,
  buildFramePrompt,
  countWords,
  getDraftShiftToken,
  getFrameLocale,
  persistFrameDrafts,
  persistScriptDrafts,
  persistVisualDrafts,
  readStoredFrameDrafts,
  readStoredScriptDrafts,
  readStoredVisualDrafts,
  splitScriptIntoFramePlan,
  svgToDataUrl,
} from "../utils/presentationDraftUtils";

function AtlasPresentationBoard() {
  const [activeSlideId, setActiveSlideId] = useState(PRESENTATION_SLIDES[0].id);
  const [visualDrafts, setVisualDrafts] = useState(readStoredVisualDrafts);
  const [scriptDrafts, setScriptDrafts] = useState(readStoredScriptDrafts);
  const [frameDrafts, setFrameDrafts] = useState(readStoredFrameDrafts);
  const [scriptEditMode, setScriptEditMode] = useState({});
  const [visualEditMode, setVisualEditMode] = useState({});
  const [draftSeed, setDraftSeed] = useState(1);
  const [draftNotes, setDraftNotes] = useState("");
  const [activeFrameId, setActiveFrameId] = useState("");
  const [frameLanguage, setFrameLanguage] = useState("ru");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDrafts, setCopiedDrafts] = useState(false);
  const [copiedFramePlan, setCopiedFramePlan] = useState(false);
  const [copiedFrameId, setCopiedFrameId] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previewMode, setPreviewMode] = useState("slide");
  const activeSlide = PRESENTATION_SLIDES.find((slide) => slide.id === activeSlideId) || PRESENTATION_SLIDES[0];
  const activeVisual = visualDrafts[activeSlide.id] || activeSlide.visual;
  const activeScript = scriptDrafts[activeSlide.id] || activeSlide.script;
  const isVisualChanged = Boolean(visualDrafts[activeSlide.id] && visualDrafts[activeSlide.id] !== activeSlide.visual);
  const isScriptChanged = Boolean(scriptDrafts[activeSlide.id] && scriptDrafts[activeSlide.id] !== activeSlide.script);
  const isScriptEditing = Boolean(scriptEditMode[activeSlide.id]);
  const isVisualEditing = Boolean(visualEditMode[activeSlide.id]);
  const localDraftCount = Object.keys(scriptDrafts).length + Object.keys(visualDrafts).length;
  const activeScriptRows = useMemo(() => {
    const estimatedRows = activeScript.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 92)), 0);
    return Math.max(18, estimatedRows + 2);
  }, [activeScript]);
  const stats = useMemo(() => {
    const words = countWords(activeScript);
    return {
      words,
      minutes: Math.max(1, Math.round(words / 130)),
    };
  }, [activeScript]);
  const visualPrompt = [
    `Create a premium cinematic 16:9 presentation slide for Atlas System, slide ${activeSlide.number}: ${activeSlide.title}.`,
    `Visual direction: ${activeVisual}`,
    activeSlide.productionNote ? `Slide-specific production note: ${activeSlide.productionNote}` : "",
    draftNotes ? `Additional designer notes: ${draftNotes}` : "",
    "Use supplied brand reference images only for identity details: the new Atlas System logo, orange/yellow/black color scheme, Architect appearance, lighting mood, premium materials, network architecture, and brand object language. Do not replace the slide concept with the reference scene; follow the Visual direction for this exact slide.",
    "Style: dark premium graphite, warm orange Atlas accents, serious CEO presentation, realistic production still, no cartoon style, no criminal hacker look, no clutter, no readable tiny text except intentional large brand words.",
  ].filter(Boolean).join(" ");
  const baseFramePlan = useMemo(() => {
    return splitScriptIntoFramePlan(activeSlide, activeScript, activeVisual, stats);
  }, [activeSlide, activeScript, activeVisual, stats]);
  const activeFramePlan = useMemo(() => {
    const totalFrames = baseFramePlan.length;

    return baseFramePlan.map((frame, index) => ({
      ...frame,
      totalFrames,
      text: getFrameLocale(frame, frameLanguage),
      prompt: buildFramePrompt(activeSlide, frame, index, activeVisual, draftNotes, frameLanguage),
      promptEn: buildFramePrompt(activeSlide, frame, index, activeVisual, draftNotes, "en"),
      promptRu: buildFramePrompt(activeSlide, frame, index, activeVisual, draftNotes, "ru"),
    }));
  }, [activeSlide, activeVisual, baseFramePlan, draftNotes, frameLanguage]);
  const activeFrameIndex = Math.max(0, activeFramePlan.findIndex((frame) => frame.id === activeFrameId));
  const activeFrame = activeFramePlan[activeFrameIndex] || activeFramePlan[0] || null;
  const activeFrameDraft = activeFrame ? frameDrafts[`${activeFrame.id}:${frameLanguage}`] : null;
  const generatedFrameCount = activeFramePlan.filter((frame) => frameDrafts[`${frame.id}:${frameLanguage}`]?.svg || (frameLanguage === "ru" && frame.generatedImage)).length;

  useEffect(() => {
    let isMounted = true;

    loadServerContent(PRESENTATION_SCRIPT_DRAFTS_STORAGE_KEY).then((savedDrafts) => {
      if (!isMounted || !savedDrafts || typeof savedDrafts !== "object") return;
      setScriptDrafts(savedDrafts);
    });
    loadServerContent(PRESENTATION_VISUAL_DRAFTS_STORAGE_KEY).then((savedDrafts) => {
      if (!isMounted || !savedDrafts || typeof savedDrafts !== "object") return;
      setVisualDrafts(savedDrafts);
    });
    loadServerContent(PRESENTATION_FRAME_DRAFTS_STORAGE_KEY).then((savedDrafts) => {
      if (!isMounted || !savedDrafts || typeof savedDrafts !== "object") return;
      setFrameDrafts(savedDrafts);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setDraftSeed(1);
    setDraftNotes("");
    setCopiedPrompt(false);
    setCopiedBrief(false);
    setCopiedScript(false);
    setCopiedFramePlan(false);
    setCopiedFrameId("");
    setActiveFrameId("");
    setPreviewMode("slide");
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [activeSlideId]);

  function updateVisual(value) {
    setVisualDrafts((current) => {
      const next = { ...current, [activeSlide.id]: value };
      if (value === activeSlide.visual) delete next[activeSlide.id];
      persistVisualDrafts(next);
      return next;
    });
    setCopiedPrompt(false);
  }

  function updateScript(value) {
    setScriptDrafts((current) => {
      const next = { ...current, [activeSlide.id]: value };
      if (value === activeSlide.script) delete next[activeSlide.id];
      persistScriptDrafts(next);
      return next;
    });
  }

  function exportLocalDrafts() {
    const payload = PRESENTATION_SLIDES.reduce((result, slide) => {
      const script = scriptDrafts[slide.id];
      const visual = visualDrafts[slide.id];
      if (script || visual) {
        result[slide.id] = {
          number: slide.number,
          title: slide.title,
          script: script || slide.script,
          visual: visual || slide.visual,
        };
      }
      return result;
    }, {});

    copyText(JSON.stringify(payload, null, 2), setCopiedDrafts);
  }

  function copyText(text, onCopied) {
    if (typeof window === "undefined" || !window.navigator?.clipboard || !text) return;
    window.navigator.clipboard.writeText(text).then(() => {
      onCopied(true);
      window.setTimeout(() => onCopied(false), 1400);
    });
  }

  function getFramePlanPayload() {
    return {
      language: frameLanguage,
      languageLabel: frameLanguage === "en" ? "English source for final video" : "Russian proofreading layer",
      sourceLanguage: "en",
      proofingLanguage: "ru",
      slide: {
        id: activeSlide.id,
        number: activeSlide.number,
        title: activeSlide.title,
      },
      recommendation:
        "Кадры считаются от текста Архитектора выбранного слайда: речь делится на смысловые фрагменты, под каждый фрагмент создаётся отдельный production frame. Монтаж: Архитектор открывает мысль, затем визуальный слайд под voiceover, затем возврат к лицу Архитектора на ключевых акцентах.",
      frames: activeFramePlan.map((frame, index) => ({
        order: index + 1,
        id: frame.id,
        mode: frame.mode,
        title: frame.title,
        titleEn: frame.titleEn,
        timing: frame.timing,
        narration: frame.narration,
        narrationEn: frame.narrationEn,
        visual: frame.visual,
        visualEn: frame.visualEn,
        prompt: frame.prompt,
        promptEn: frame.promptEn,
        promptRu: frame.promptRu,
      })),
    };
  }

  function copyFramePlan() {
    copyText(JSON.stringify(getFramePlanPayload(), null, 2), setCopiedFramePlan);
  }

  function downloadFramePlan() {
    if (typeof window === "undefined" || !activeFramePlan.length) return;

    const blob = new Blob([JSON.stringify(getFramePlanPayload(), null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atlas-slide-${activeSlide.number}-frames.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function updateFrameDrafts(nextDrafts) {
    setFrameDrafts(nextDrafts);
    persistFrameDrafts(nextDrafts);
  }

  function generateFrameDraft(frame = activeFrame) {
    if (!frame) return;

    const frameIndex = activeFramePlan.findIndex((item) => item.id === frame.id);
    const svg = buildFrameDraftSvg(frame, frameIndex >= 0 ? frameIndex : 0, draftSeed + frameIndex, frameLanguage);
    updateFrameDrafts({
      ...frameDrafts,
      [`${frame.id}:${frameLanguage}`]: {
        svg,
        generatedAt: new Date().toISOString(),
        prompt: frame.prompt,
        language: frameLanguage,
      },
    });
    setActiveFrameId(frame.id);
  }

  function generateAllFrameDrafts() {
    if (!activeFramePlan.length) return;

    const nextDrafts = { ...frameDrafts };
    activeFramePlan.forEach((frame, index) => {
      nextDrafts[`${frame.id}:${frameLanguage}`] = {
        svg: buildFrameDraftSvg(frame, index, draftSeed + index, frameLanguage),
        generatedAt: new Date().toISOString(),
        prompt: frame.prompt,
        language: frameLanguage,
      };
    });
    updateFrameDrafts(nextDrafts);
  }

  function downloadFrameDraft(frame = activeFrame) {
    if (typeof window === "undefined" || !frame) return;

    const draft = frameDrafts[`${frame.id}:${frameLanguage}`];
    if (!draft?.svg && frame.generatedImage && frameLanguage === "ru") {
      const link = document.createElement("a");
      link.href = frame.generatedImage;
      link.download = `atlas-slide-03-frame-${frame.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const svg = draft?.svg || buildFrameDraftSvg(frame, activeFramePlan.findIndex((item) => item.id === frame.id), draftSeed, frameLanguage);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atlas-slide-03-frame-${frame.id}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  function goToFrame(direction) {
    if (!activeFramePlan.length) return;

    const nextIndex = (activeFrameIndex + direction + activeFramePlan.length) % activeFramePlan.length;
    setActiveFrameId(activeFramePlan[nextIndex].id);
  }

  function copyFramePrompt(frame) {
    copyText(frame.prompt, (value) => {
      if (!value) return;
      setCopiedFrameId(frame.id);
      window.setTimeout(() => setCopiedFrameId(""), 1400);
    });
  }

  function toggleSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(activeScript);
    utterance.lang = "ru-RU";
    utterance.rate = 0.88;
    utterance.pitch = 0.82;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  return (
    <section className="analytics-surface analytics-presentation-board">
      <div className="analytics-presentation-head">
        <div>
          <span className="analytics-kicker">CEO-презентация</span>
          <h2 className="analytics-agent-template-title">Согласованные слайды Atlas System</h2>
          <p className="analytics-page-subtitle">
            Рабочая база для дизайнера, монтажёра и диктора: отдельно визуальное ТЗ и отдельно речь Архитектора.
          </p>
        </div>
        <div className="analytics-presentation-counter">
          <strong>{PRESENTATION_SLIDES.length}</strong>
          <span>слайдов</span>
        </div>
      </div>

      <div className="analytics-presentation-layout">
        <aside className="analytics-presentation-slide-list" aria-label="Слайды CEO-презентации">
          {PRESENTATION_SLIDES.map((slide) => (
            <button
              key={slide.id}
              type="button"
              className={`analytics-presentation-slide-tab${activeSlide.id === slide.id ? " analytics-presentation-slide-tab-active" : ""}`}
              onClick={() => setActiveSlideId(slide.id)}
            >
              <span>{slide.number}</span>
              <strong>{slide.title}</strong>
            </button>
          ))}
        </aside>

        <div className="analytics-presentation-content">
          <div className="analytics-presentation-title-row">
            <div>
              <span className="analytics-presentation-number">Слайд {activeSlide.number}</span>
              <h3>{activeSlide.title}</h3>
            </div>
            <div className="analytics-presentation-runtime">
              {stats.words} слов · около {stats.minutes} мин.
            </div>
          </div>

          {localDraftCount > 0 ? (
            <div className="analytics-presentation-local-warning">
              <div>
                <strong>Есть локальные правки: {localDraftCount}</strong>
                <span>Они сохранены только в этом браузере. Для прода экспортируйте правки и зафиксируйте их в коде.</span>
              </div>
              <button type="button" onClick={exportLocalDrafts}>
                {copiedDrafts ? "Правки скопированы" : "Скопировать все правки"}
              </button>
            </div>
          ) : null}

          <article className="analytics-presentation-card analytics-presentation-script analytics-presentation-script-top">
            <div className="analytics-presentation-brief-head">
              <span className="analytics-kicker">Текст Архитектора</span>
              <div>
                {isScriptChanged ? <strong>локальный черновик, не прод</strong> : null}
                <button type="button" onClick={() => setScriptEditMode((current) => ({ ...current, [activeSlide.id]: !current[activeSlide.id] }))}>
                  {isScriptEditing ? "Готово" : "Редактировать"}
                </button>
                <button type="button" onClick={() => copyText(activeScript, setCopiedScript)}>
                  {copiedScript ? "Скопировано" : "Скопировать"}
                </button>
              </div>
            </div>
            <textarea
              className="analytics-presentation-script-input"
              value={activeScript}
              onChange={(event) => updateScript(event.target.value)}
              readOnly={!isScriptEditing}
              rows={activeScriptRows}
            />
          </article>

          <div className="analytics-presentation-grid">
            <article className="analytics-presentation-card">
              <div className="analytics-presentation-brief-head">
                <span className="analytics-kicker">ТЗ для визуального отображения</span>
                <div>
                  {isVisualChanged ? <strong>локальный черновик, не прод</strong> : null}
                  <button type="button" onClick={() => setVisualEditMode((current) => ({ ...current, [activeSlide.id]: !current[activeSlide.id] }))}>
                    {isVisualEditing ? "Готово" : "Редактировать"}
                  </button>
                  <button type="button" onClick={() => copyText(activeVisual, setCopiedBrief)}>
                    {copiedBrief ? "Скопировано" : "Скопировать"}
                  </button>
                </div>
              </div>
              <textarea
                className="analytics-presentation-visual-input"
                value={activeVisual}
                onChange={(event) => updateVisual(event.target.value)}
                readOnly={!isVisualEditing}
                rows="4"
              />
            </article>

            <article className="analytics-presentation-card analytics-presentation-direction">
              <span className="analytics-kicker">Режиссура ролика</span>
              <h4>Формат: Архитектор + смысловые слайды</h4>
              <p>
                Ролик не идёт как 12 статичных слайдов подряд. Каждый блок строится как чередование: говорящая голова Архитектора,
                затем визуальный слайд под его голос, затем возврат к лицу Архитектора на ключевой мысли.
              </p>
              <div className="analytics-presentation-direction-steps">
                <span>1. Архитектор открывает мысль в кадре</span>
                <span>2. Слайд раскрывает визуальный смысл под voiceover</span>
                <span>3. Архитектор возвращается на акценте</span>
                <span>4. Переход к следующему слайду</span>
              </div>
              <p>
                Образ Архитектора: тёмный премиальный кадр, лицо частично в тени, спокойная серьёзная подача, минимум жестов.
                Он не “ведущий презентации”, а голос системы.
              </p>
            </article>

            {activeFramePlan.length ? (
              <article className="analytics-presentation-card analytics-presentation-frame-plan">
                <div className="analytics-presentation-brief-head">
                  <div>
                    <span className="analytics-kicker">Кадры для генерации</span>
                    <h4>Слайд {activeSlide.number}: портянка из {activeFramePlan.length} кадров под речь</h4>
                  </div>
                  <div>
                    <div className="analytics-presentation-frame-language" aria-label="Язык кадров">
                      <button type="button" className={frameLanguage === "en" ? "active" : ""} onClick={() => setFrameLanguage("en")}>
                        EN источник
                      </button>
                      <button type="button" className={frameLanguage === "ru" ? "active" : ""} onClick={() => setFrameLanguage("ru")}>
                        RU вычитка
                      </button>
                    </div>
                    <button type="button" onClick={copyFramePlan}>
                      {copiedFramePlan ? "Портянка скопирована" : "Скопировать JSON"}
                    </button>
                    <button type="button" onClick={downloadFramePlan}>
                      Скачать JSON
                    </button>
                    <button type="button" onClick={generateAllFrameDrafts}>
                      Сгенерировать все кадры
                    </button>
                  </div>
                </div>

                <div className="analytics-presentation-frame-summary">
                  <strong>Как это работает</strong>
                  <span>
                    Блок берёт полный текст Архитектора выбранного слайда, делит его на смысловые куски по длительности речи
                    и делает под них отдельные кадры. EN — слой для финального английского ролика, RU — русская вычитка смысла.
                  </span>
                </div>

                {activeFrame ? (
                  <div className="analytics-presentation-frame-generator">
                  <div className="analytics-presentation-frame-stage">
                      {activeFrameDraft?.svg ? (
                        <img src={svgToDataUrl(activeFrameDraft.svg)} alt={`Черновик кадра ${activeFrame.id}`} />
                      ) : activeFrame.generatedImage && frameLanguage === "ru" ? (
                        <img src={activeFrame.generatedImage} alt={`Готовый кадр ${activeFrame.id}`} />
                      ) : (
                        <div className="analytics-presentation-frame-empty">
                          <span>{String(activeFrameIndex + 1).padStart(2, "0")}</span>
                          <strong>{activeFrame.text.title}</strong>
                          <small>Нажми «Сгенерировать кадр», и здесь появится черновой 16:9 кадр по этому фрагменту речи.</small>
                        </div>
                      )}
                    </div>
                    <div className="analytics-presentation-frame-controls">
                      <div>
                        <span className="analytics-presentation-frame-time">{activeFrame.timing}</span>
                        <h5>{activeFrame.text.title}</h5>
                        <p>{activeFrame.text.narration}</p>
                        <small>
                          {frameLanguage === "en" ? "English source for final video" : "Русская вычитка смысла"}. Готово: {generatedFrameCount} из {activeFramePlan.length}
                        </small>
                      </div>
                      <div className="analytics-presentation-frame-buttons">
                        <button type="button" onClick={() => goToFrame(-1)}>Назад</button>
                        <button type="button" onClick={() => generateFrameDraft(activeFrame)}>Сгенерировать кадр</button>
                        <button type="button" onClick={() => copyFramePrompt(activeFrame)}>
                          {copiedFrameId === activeFrame.id ? "Промпт скопирован" : "Скопировать промпт"}
                        </button>
                        <button type="button" onClick={() => downloadFrameDraft(activeFrame)}>Скачать</button>
                        <button type="button" onClick={() => goToFrame(1)}>Дальше</button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="analytics-presentation-frame-strip" aria-label={`Портянка кадров слайда ${activeSlide.number}`}>
                  {activeFramePlan.map((frame, index) => (
                    <section
                      key={frame.id}
                      className={`analytics-presentation-frame-card${activeFrame?.id === frame.id ? " analytics-presentation-frame-card-active" : ""}`}
                    >
                      <div className="analytics-presentation-frame-preview">
                        {frameDrafts[`${frame.id}:${frameLanguage}`]?.svg ? (
                          <img src={svgToDataUrl(frameDrafts[`${frame.id}:${frameLanguage}`].svg)} alt={`Черновик кадра ${frame.id}`} />
                        ) : frame.generatedImage && frameLanguage === "ru" ? (
                          <img src={frame.generatedImage} alt={`Готовый кадр ${frame.id}`} />
                        ) : null}
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{frame.text.mode}</strong>
                      </div>
                      <div className="analytics-presentation-frame-body">
                        <div>
                          <span className="analytics-presentation-frame-time">{frame.timing}</span>
                          <h5>{frame.text.title}</h5>
                        </div>
                        <p>{frame.text.narration}</p>
                        <small>{frame.text.visual}</small>
                        <div className="analytics-presentation-frame-card-actions">
                          <button type="button" onClick={() => setActiveFrameId(frame.id)}>
                            Открыть
                          </button>
                          <button type="button" onClick={() => generateFrameDraft(frame)}>
                            Генерировать
                          </button>
                          <button type="button" onClick={() => downloadFrameDraft(frame)}>
                            Скачать
                          </button>
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            ) : null}

            <article className="analytics-presentation-card analytics-presentation-tools">
              <div className="analytics-presentation-tools-head">
                <div>
                  <span className="analytics-kicker">Production tools</span>
                  <h4>Черновая генерация слайда и озвучки</h4>
                </div>
                <div>
                  <button type="button" onClick={() => setDraftSeed((current) => current + 1)}>
                    Перегенерировать макет
                  </button>
                  <button type="button" onClick={() => copyText(visualPrompt, setCopiedPrompt)}>
                    {copiedPrompt ? "Промпт скопирован" : "Скопировать промпт"}
                  </button>
                  <button type="button" onClick={toggleSpeech}>
                    {isSpeaking ? "Остановить голос" : "Прослушать текст"}
                  </button>
                </div>
              </div>

              <label className="analytics-presentation-notes">
                <span>Уточнение дизайна</span>
                <input
                  className="analytics-presentation-field"
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                  placeholder="Например: больше силуэта, меньше текста, акцент на логотипе"
                />
              </label>

              <div className="analytics-presentation-mode-control" aria-label="Режим монтажного предпросмотра">
                {PRESENTATION_PREVIEW_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={previewMode === mode.id ? "analytics-presentation-mode-active" : ""}
                    onClick={() => setPreviewMode(mode.id)}
                  >
                    <strong>{mode.label}</strong>
                    <span>{mode.hint}</span>
                  </button>
                ))}
              </div>

              <div className="analytics-presentation-tools-grid">
                <div className={`analytics-presentation-draft analytics-presentation-draft-mode-${previewMode} analytics-presentation-draft-shift-${getDraftShiftToken(draftSeed)}`}>
                  {activeSlide.generatedImage ? (
                    <img src={activeSlide.generatedImage} alt={`AI-визуал слайда ${activeSlide.number}: ${activeSlide.title}`} />
                  ) : null}
                  {activeSlide.id === "slide-01" && activeSlide.logoImage ? (
                    <img className="analytics-presentation-corner-logo" src={activeSlide.logoImage} alt="Atlas System" />
                  ) : null}
                  {activeSlide.id === "slide-03" ? (
                    <div className="analytics-presentation-tariff-layer" aria-label="Тарифы Smart Cycle">
                      <span className="analytics-presentation-tariff-kicker">Smart Cycle</span>
                      <strong>Сроки и добавочная дельта</strong>
                      <div>
                        {SMART_CYCLE_TARIFFS.map((tariff) => (
                          <span key={tariff.term} className="analytics-presentation-tariff-chip">
                            <small>{tariff.term}</small>
                            <b>{tariff.delta}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {activeSlide.id === "slide-09" && !activeSlide.generatedImage ? (
                    <div className="analytics-presentation-status-layer" aria-label="Таблица статусов партнёрской системы Atlas">
                      <div className="analytics-presentation-status-head">
                        <span>Партнёрская система</span>
                        <strong>Реферальная программа для MLM-партнёров</strong>
                      </div>
                      <table className="analytics-presentation-status-table">
                        <thead>
                          <tr>
                            <th>Статус</th>
                            <th>Личные циклы, $</th>
                            <th>1-я линия + 50% 2-й, $</th>
                            <th>Объём в глубину, $</th>
                            <th>Бонус дельты, %</th>
                            <th>Matching, %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PARTNER_STATUS_TABLE_ROWS.map((row) => (
                            <tr key={row.status} className={`analytics-presentation-status-row-${row.tone}`}>
                              <th>{row.status}</th>
                              <td>{row.personal}</td>
                              <td>{row.line}</td>
                              <td>{row.depth}</td>
                              <td>{row.bonus}</td>
                              <td>{row.matching || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  <div className="analytics-presentation-architect-head" aria-hidden="true">
                    <div className="analytics-presentation-architect-light" />
                    <div className="analytics-presentation-architect-figure">
                      <span className="analytics-presentation-architect-head-shape" />
                      <span className="analytics-presentation-architect-neck" />
                      <span className="analytics-presentation-architect-jacket" />
                    </div>
                    <div className="analytics-presentation-architect-caption">
                      <span>Архитектор в кадре</span>
                      <strong>{activeSlide.title}</strong>
                    </div>
                  </div>
                  {!activeSlide.hideDraftOverlay ? (
                    <div className="analytics-presentation-draft-overlay">
                      {activeSlide.id === "slide-01" ? (
                        <strong className="analytics-presentation-draft-subtitle">Остров устойчивости в эпоху глобальных перемен</strong>
                      ) : activeSlide.overlayText ? (
                        <strong className="analytics-presentation-draft-subtitle">{activeSlide.overlayText}</strong>
                      ) : (
                        <>
                          <span>Atlas System</span>
                          <strong>{activeSlide.title}</strong>
                          <small>Slide {activeSlide.number} / draft v{draftSeed}</small>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <label className="analytics-presentation-prompt">
                <span>Image prompt</span>
                <textarea className="analytics-presentation-field" value={visualPrompt} readOnly rows="5" />
              </label>
            </article>

          </div>
        </div>
      </div>
    </section>
  );
}

export default AtlasPresentationBoard;
