import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  LockKeyhole,
  RefreshCcw,
  Route,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  atlasFunnelPilotProofs,
  atlasFunnelPilotQuestions,
  atlasFunnelPilotSegments,
  atlasFunnelPilotSteps,
} from "../data/atlasFunnelPilotData";
import { postServerJson } from "../services/contentStore";
import {
  buildAtlasFunnelAttribution,
  calculateAtlasFunnelProgress,
  createAtlasFunnelEventId,
  createAtlasFunnelSessionId,
  determineAtlasFunnelSegment,
  readAtlasFunnelOutbox,
  readAtlasFunnelSession,
  saveAtlasFunnelOutbox,
  saveAtlasFunnelSession,
} from "../utils/atlasFunnelPilotUtils";
import "./AtlasFunnelPilotPage.css";

const OFFICIAL_ATLAS_URL = "https://atlas-system.io";

function createInitialPilotState() {
  const saved = readAtlasFunnelSession();
  if (saved?.sessionId) {
    return {
      sessionId: saved.sessionId,
      sessionToken: String(saved.sessionToken || ""),
      sessionExpiresAt: String(saved.sessionExpiresAt || ""),
      screen: ["intro", "quiz", "route", "complete"].includes(saved.screen) ? saved.screen : "intro",
      questionIndex: Math.max(0, Math.min(Number(saved.questionIndex) || 0, atlasFunnelPilotQuestions.length - 1)),
      stepIndex: Math.max(0, Math.min(Number(saved.stepIndex) || 0, atlasFunnelPilotSteps.length - 1)),
      answers: saved.answers && typeof saved.answers === "object" ? saved.answers : {},
      segmentId: atlasFunnelPilotSegments[saved.segmentId] ? saved.segmentId : "",
      visitTracked: Boolean(saved.visitTracked),
    };
  }
  return {
    sessionId: createAtlasFunnelSessionId(),
    sessionToken: "",
    sessionExpiresAt: "",
    screen: "intro",
    questionIndex: 0,
    stepIndex: 0,
    answers: {},
    segmentId: "",
    visitTracked: false,
  };
}

function AtlasLogo() {
  return (
    <a className="atlas-pilot-logo" href={OFFICIAL_ATLAS_URL} target="_blank" rel="noreferrer" aria-label="Atlas System">
      <img src="/generated/atlas-logo-new-transparent.png" alt="" />
    </a>
  );
}

function AtlasFunnelPilotPage() {
  const [pilot, setPilot] = useState(createInitialPilotState);
  const [eventState, setEventState] = useState("ready");
  const attribution = useMemo(
    () => buildAtlasFunnelAttribution(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const visitRequestRef = useRef(false);
  const pilotRef = useRef(pilot);
  const sessionCredentialsRef = useRef(
    pilot.sessionToken
      ? { sessionId: pilot.sessionId, sessionToken: pilot.sessionToken, sessionExpiresAt: pilot.sessionExpiresAt }
      : null,
  );
  const sessionRequestRef = useRef(null);
  const outboxRef = useRef(readAtlasFunnelOutbox());
  const flushRequestRef = useRef(null);
  const generationRef = useRef(0);
  const routeStepRefs = useRef([]);
  const segment = atlasFunnelPilotSegments[pilot.segmentId] || atlasFunnelPilotSegments["web3-new"];
  const question = atlasFunnelPilotQuestions[pilot.questionIndex];
  const message = atlasFunnelPilotSteps[pilot.stepIndex];

  useEffect(() => {
    pilotRef.current = pilot;
    saveAtlasFunnelSession(pilot);
  }, [pilot]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.scrollTo({ top: 0, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [pilot.screen, pilot.questionIndex, pilot.stepIndex]);

  useEffect(() => {
    if (pilot.visitTracked || visitRequestRef.current) return;
    visitRequestRef.current = true;
    const generation = generationRef.current;
    trackEvent("funnel_visit").then((ok) => {
      visitRequestRef.current = false;
      if (ok && generation === generationRef.current) {
        setPilot((current) => ({ ...current, visitTracked: true }));
      }
    });
  }, [pilot.visitTracked]);

  useEffect(() => {
    const flush = () => void flushEventOutbox();
    window.addEventListener("online", flush);
    window.addEventListener("pageshow", flush);
    if (outboxRef.current.length) flush();
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("pageshow", flush);
    };
  }, []);

  useEffect(() => {
    if (pilot.screen !== "route" || typeof window === "undefined" || !window.matchMedia("(max-width: 900px)").matches) return;
    routeStepRefs.current[pilot.stepIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [pilot.screen, pilot.stepIndex]);

  async function ensureFunnelSession(forceRenew = false) {
    const currentCredentials = sessionCredentialsRef.current;
    const expiresAt = Date.parse(currentCredentials?.sessionExpiresAt || "");
    if (
      currentCredentials?.sessionToken
      && !forceRenew
      && Number.isFinite(expiresAt)
      && expiresAt > Date.now() + 60_000
    ) return currentCredentials;
    if (sessionRequestRef.current) return sessionRequestRef.current;
    const renewalPayload = currentCredentials?.sessionToken
      ? { sessionId: currentCredentials.sessionId, sessionToken: currentCredentials.sessionToken }
      : {};
    const requestGeneration = generationRef.current;
    let request;
    request = postServerJson("/api/funnel/session", renewalPayload).then((result) => {
      if (requestGeneration !== generationRef.current) return null;
      if (!result.ok || !result.payload?.sessionId || !result.payload?.sessionToken) return null;
      const credentials = {
        sessionId: result.payload.sessionId,
        sessionToken: result.payload.sessionToken,
        sessionExpiresAt: result.payload.expiresAt || "",
      };
      sessionCredentialsRef.current = credentials;
      setPilot((current) => ({ ...current, ...credentials }));
      return credentials;
    }).finally(() => {
      if (sessionRequestRef.current === request) sessionRequestRef.current = null;
    });
    sessionRequestRef.current = request;
    return request;
  }

  async function deliverOutboxEvent(item) {
    let credentials = await ensureFunnelSession();
    if (!credentials) return false;
    let result = await postServerJson("/api/funnel/events", {
      ...item.payload,
      ...credentials,
      clientEventId: item.id,
    }, { keepalive: item.keepalive });
    if (result.status === 401) {
      credentials = await ensureFunnelSession(true);
      if (!credentials) return false;
      result = await postServerJson("/api/funnel/events", {
        ...item.payload,
        ...credentials,
        clientEventId: item.id,
      }, { keepalive: item.keepalive });
    }
    return result.ok;
  }

  function flushEventOutbox() {
    if (flushRequestRef.current) return flushRequestRef.current;
    setEventState("sending");
    flushRequestRef.current = (async () => {
      while (outboxRef.current.length) {
        const item = outboxRef.current[0];
        const delivered = await deliverOutboxEvent(item);
        if (!delivered) {
          if (!outboxRef.current.some((queued) => queued.id === item.id)) continue;
          setEventState("offline");
          return false;
        }
        outboxRef.current = outboxRef.current.filter((queued) => queued.id !== item.id);
        saveAtlasFunnelOutbox(outboxRef.current);
        if (item.payload.event === "funnel_visit" && item.generation === generationRef.current) {
          setPilot((current) => ({ ...current, visitTracked: true }));
        }
      }
      setEventState("ready");
      return true;
    })().finally(() => {
      flushRequestRef.current = null;
    });
    return flushRequestRef.current;
  }

  function trackEvent(event, details = {}) {
    const current = pilotRef.current;
    outboxRef.current = [...outboxRef.current, {
      id: createAtlasFunnelEventId(),
      generation: generationRef.current,
      keepalive: Boolean(details.keepalive),
      payload: {
        event,
        segmentId: details.segmentId || "",
        questionId: details.questionId || "",
        answerId: details.answerId || "",
        stepId: details.stepId || "",
        source: details.source || current.answers.source || "",
        attribution,
      },
    }].slice(-64);
    saveAtlasFunnelOutbox(outboxRef.current);
    return flushEventOutbox();
  }

  function startQuiz() {
    setPilot((current) => ({ ...current, screen: "quiz", questionIndex: 0 }));
    void trackEvent("funnel_started");
  }

  function chooseAnswer(answerId) {
    const nextAnswers = { ...pilot.answers, [question.id]: answerId };
    void trackEvent("question_answered", {
      questionId: question.id,
      answerId,
      source: question.id === "source" ? answerId : nextAnswers.source,
    });

    if (pilot.questionIndex < atlasFunnelPilotQuestions.length - 1) {
      setPilot((current) => ({
        ...current,
        answers: nextAnswers,
        questionIndex: current.questionIndex + 1,
      }));
      return;
    }

    const segmentId = determineAtlasFunnelSegment(nextAnswers);
    setPilot((current) => ({
      ...current,
      answers: nextAnswers,
      segmentId,
      screen: "route",
      stepIndex: 0,
    }));
    void trackEvent("segment_selected", { segmentId, source: nextAnswers.source });
    void trackEvent("step_opened", { segmentId, stepId: atlasFunnelPilotSteps[0].id, source: nextAnswers.source });
  }

  function previousQuestion() {
    if (pilot.questionIndex === 0) {
      setPilot((current) => ({ ...current, screen: "intro" }));
      return;
    }
    setPilot((current) => ({ ...current, questionIndex: current.questionIndex - 1 }));
  }

  function nextStep() {
    if (pilot.stepIndex >= atlasFunnelPilotSteps.length - 1) {
      setPilot((current) => ({ ...current, screen: "complete" }));
      void trackEvent("route_completed", { stepId: message.id });
      return;
    }
    const nextIndex = pilot.stepIndex + 1;
    const nextMessage = atlasFunnelPilotSteps[nextIndex];
    setPilot((current) => ({ ...current, stepIndex: nextIndex }));
    void trackEvent("step_opened", { stepId: nextMessage.id });
  }

  function previousStep() {
    setPilot((current) => ({ ...current, stepIndex: Math.max(0, current.stepIndex - 1) }));
  }

  function openProof() {
    void trackEvent("proof_opened", { stepId: message.id });
  }

  function completeAction() {
    void trackEvent("qualified_action", { stepId: "official-site", keepalive: true });
  }

  function restartPilot() {
    const next = {
      sessionId: createAtlasFunnelSessionId(),
      sessionToken: "",
      sessionExpiresAt: "",
      screen: "intro",
      questionIndex: 0,
      stepIndex: 0,
      answers: {},
      segmentId: "",
      visitTracked: false,
    };
    generationRef.current += 1;
    visitRequestRef.current = false;
    sessionCredentialsRef.current = null;
    sessionRequestRef.current = null;
    outboxRef.current = [];
    saveAtlasFunnelOutbox([]);
    setPilot(next);
  }

  return (
    <main className="atlas-pilot-page">
      <header className="atlas-pilot-header">
        <AtlasLogo />
        <div className="atlas-pilot-header-meta">
          <span><LockKeyhole size={15} /> Без подключения кошелька</span>
          <span className={`atlas-pilot-sync atlas-pilot-sync-${eventState}`}>
            <i /> {eventState === "offline" ? "Прогресс сохранён в браузере" : "Анонимный пилот"}
          </span>
        </div>
      </header>

      {pilot.screen === "intro" ? (
        <>
          <section className="atlas-pilot-hero">
            <div className="atlas-pilot-hero-inner">
              <span className="atlas-pilot-kicker">Atlas Web3 Start · 7 минут</span>
              <h1>Разберитесь в Atlas.<br />Проверьте ключевые факты.<br /><strong>Решите самостоятельно.</strong></h1>
              <p>
                Короткий маршрут объяснит Smart Cycle, покажет риски и подберёт порядок материалов под ваш опыт и интерес.
                Регистрация и подключение кошелька не требуются.
              </p>
              <div className="atlas-pilot-hero-actions">
                <button type="button" onClick={startQuiz}>Начать маршрут <ArrowRight size={18} /></button>
                <a href={OFFICIAL_ATLAS_URL} target="_blank" rel="noreferrer" onClick={openProof}>
                  Официальный сайт <ExternalLink size={16} />
                </a>
              </div>
              <div className="atlas-pilot-hero-visual" aria-hidden="true">
                <img src="/generated/atlas-network-reference.png" alt="" />
              </div>
              <div className="atlas-pilot-trust-row">
                <span><ShieldCheck size={18} /><b>Без обещаний дохода</b><small>Только механика и ограничения</small></span>
                <span><FileCheck2 size={18} /><b>Проверяемые материалы</b><small>Документация и первоисточники</small></span>
                <span><Route size={18} /><b>Ваш порядок изучения</b><small>4 маршрута вместо одного текста</small></span>
              </div>
            </div>
          </section>

          <section className="atlas-pilot-proof-band">
            <div>
              <span>Перед началом</span>
              <h2>Atlas не является банковским вкладом или обещанием фиксированного результата</h2>
              <p>Участие добровольное. Claim и получение добавочной помощи не гарантируются. Решение принимается после самостоятельного изучения условий и рисков.</p>
            </div>
            <button type="button" onClick={startQuiz}>Понятно, продолжить <ArrowRight size={17} /></button>
          </section>
        </>
      ) : null}

      {pilot.screen === "quiz" ? (
        <section className="atlas-pilot-quiz">
          <div className="atlas-pilot-quiz-progress">
            <span>Вопрос {pilot.questionIndex + 1} из {atlasFunnelPilotQuestions.length}</span>
            <i><b style={{ width: `${((pilot.questionIndex + 1) / atlasFunnelPilotQuestions.length) * 100}%` }} /></i>
          </div>
          <div className="atlas-pilot-quiz-copy">
            <span>{question.eyebrow}</span>
            <h1>{question.title}</h1>
            <p>{question.description}</p>
          </div>
          <div className="atlas-pilot-options">
            {question.options.map((option) => (
              <button key={option.id} type="button" onClick={() => chooseAnswer(option.id)}>
                <span>{option.label}<small>{option.detail}</small></span>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
          <button className="atlas-pilot-back" type="button" onClick={previousQuestion}><ArrowLeft size={17} /> Назад</button>
        </section>
      ) : null}

      {pilot.screen === "route" ? (
        <section className="atlas-pilot-route">
          <aside className="atlas-pilot-route-aside">
            <span className="atlas-pilot-kicker">Ваш маршрут</span>
            <h2>{segment.title}</h2>
            <p>{segment.intro}</p>
            <div className="atlas-pilot-route-persona">
              <CheckCircle2 size={19} />
              <span><small>Определённый профиль</small><b>{segment.label}</b></span>
            </div>
            <ol>
              {atlasFunnelPilotSteps.map((item, index) => (
                <li
                  key={item.id}
                  ref={(node) => { routeStepRefs.current[index] = node; }}
                  className={index === pilot.stepIndex ? "is-active" : index < pilot.stepIndex ? "is-done" : ""}
                >
                  <span>{index < pilot.stepIndex ? <Check size={14} /> : index + 1}</span>
                  <b>{item.title}</b>
                </li>
              ))}
            </ol>
          </aside>

          <article className="atlas-pilot-route-content">
            <div className="atlas-pilot-route-progress">
              <span>Шаг {pilot.stepIndex + 1} из {atlasFunnelPilotSteps.length}</span>
              <b>{calculateAtlasFunnelProgress(pilot.stepIndex, atlasFunnelPilotSteps.length)}%</b>
              <i><em style={{ width: `${calculateAtlasFunnelProgress(pilot.stepIndex, atlasFunnelPilotSteps.length)}%` }} /></i>
            </div>
            <span className="atlas-pilot-kicker">{message.eyebrow}</span>
            <h1>{message.title}</h1>
            <blockquote>{message.hook}</blockquote>
            <p>{message.body}</p>
            <div className="atlas-pilot-evidence">
              <ShieldCheck size={22} />
              <span><small>Что проверить</small><b>{message.proof}</b></span>
            </div>

            {pilot.stepIndex === 4 ? (
              <div className="atlas-pilot-proof-list">
                {atlasFunnelPilotProofs.map((proof) => (
                  <div key={proof.id}>
                    <span>{proof.label}</span>
                    <b>{proof.title}</b>
                    <p>{proof.text}</p>
                  </div>
                ))}
                <a href={OFFICIAL_ATLAS_URL} target="_blank" rel="noreferrer" onClick={openProof}>
                  Открыть материалы Atlas <ExternalLink size={16} />
                </a>
              </div>
            ) : null}

            {pilot.stepIndex === 5 ? (
              <div className="atlas-pilot-wallet-check">
                <WalletCards size={24} />
                <div>
                  <b>Никому не передавайте seed-фразу</b>
                  <span>Перед любой операцией отдельно проверьте адрес, сеть BNB Smart Chain, токен USDT BEP-20 и наличие BNB для комиссии.</span>
                </div>
              </div>
            ) : null}

            <footer>
              <button type="button" className="atlas-pilot-secondary" onClick={previousStep} disabled={pilot.stepIndex === 0}>
                <ArrowLeft size={17} /> Назад
              </button>
              <button type="button" className="atlas-pilot-primary" onClick={nextStep}>
                {pilot.stepIndex === atlasFunnelPilotSteps.length - 1 ? "Завершить маршрут" : message.cta}
                <ArrowRight size={17} />
              </button>
            </footer>
          </article>
        </section>
      ) : null}

      {pilot.screen === "complete" ? (
        <section className="atlas-pilot-complete">
          <div className="atlas-pilot-complete-mark"><Check size={36} /></div>
          <span className="atlas-pilot-kicker">{segment.label}</span>
          <h1>{segment.finalTitle}</h1>
          <p>{segment.finalText}</p>
          <div className="atlas-pilot-complete-summary">
            <div><b>5</b><span>ответов сформировали маршрут</span></div>
            <div><b>6</b><span>шагов пройдено</span></div>
            <div><b>0</b><span>персональных данных запрошено</span></div>
          </div>
          <div className="atlas-pilot-complete-actions">
            <a href={OFFICIAL_ATLAS_URL} target="_blank" rel="noreferrer" onClick={completeAction}>
              {segment.cta} <ExternalLink size={17} />
            </a>
            <button type="button" onClick={restartPilot}><RefreshCcw size={16} /> Пройти заново</button>
          </div>
          <small>Переход не означает согласие на участие. Сначала изучите актуальные условия и риски на официальном сайте.</small>
        </section>
      ) : null}
    </main>
  );
}

export default AtlasFunnelPilotPage;
