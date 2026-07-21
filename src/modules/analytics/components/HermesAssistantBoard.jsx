import {
  BrainCircuit,
  History,
  Mic,
  RotateCcw,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { prepareHermesSpeechText, resolveRecognizedSpeech } from "../utils/hermesVoice.js";
import "./HermesAssistantBoard.css";

const HISTORY_STORAGE_KEY = "atlas.hermes.assistantHistory.v1";
const MAX_HISTORY_MESSAGES = 40;
const MAX_SPEECH_TEXT_LENGTH = 3500;

const QUICK_PROMPTS = [
  "Что сегодня решили по Atlas?",
  "Какие задачи сейчас самые важные?",
  "Что обсуждали по продвижению Atlas?",
  "Собери краткий итог последних решений.",
];

const STATUS_COPY = {
  idle: { label: "Готов", helper: "Нажмите на микрофон и говорите" },
  listening: { label: "Слушаю", helper: "Говорите. Повторное нажатие остановит запись" },
  thinking: { label: "Думаю", helper: "Ищу ответ в памяти Atlas" },
  speaking: { label: "Отвечаю", helper: "Гермес озвучивает ответ" },
  error: { label: "Нужна помощь", helper: "Попробуйте ещё раз или напишите сообщение" },
};

function readHistory() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY_MESSAGES) : [];
  } catch {
    return [];
  }
}

function createMessage(role, text) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text: String(text || "").trim(),
    createdAt: new Date().toISOString(),
  };
}

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function HermesAssistantBoard() {
  const [messages, setMessages] = useState(readHistory);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const [connection, setConnection] = useState("checking");
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const recognitionRef = useRef(null);
  const recognitionErrorRef = useRef(false);
  const transcriptEndRef = useRef(null);
  const pendingVoiceTextRef = useRef("");
  const latestVoiceTextRef = useRef("");
  const requestInFlightRef = useRef(false);
  const requestControllerRef = useRef(null);
  const speechControllerRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");

  const recognitionSupported = useMemo(() => Boolean(getRecognitionConstructor()), []);
  const speechSupported = typeof window !== "undefined" && typeof window.Audio === "function";
  const statusCopy = STATUS_COPY[status] || STATUS_COPY.idle;
  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant") || null,
    [messages],
  );

  async function checkConnection() {
    setConnection("checking");
    try {
      const response = await fetch("/api/marketing/hermes-health", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      setConnection(response.ok && payload?.online ? "online" : "offline");
    } catch {
      setConnection("offline");
    }
  }

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)));
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (status !== "thinking") return undefined;
    const startedAt = Date.now();
    setThinkingSeconds(0);
    const interval = window.setInterval(() => {
      setThinkingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    requestControllerRef.current?.abort?.();
    speechControllerRef.current?.abort?.();
    audioRef.current?.pause?.();
    if (audioUrlRef.current) window.URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  function stopSpeaking() {
    speechControllerRef.current?.abort?.();
    speechControllerRef.current = null;
    audioRef.current?.pause?.();
    audioRef.current = null;
    if (audioUrlRef.current) {
      window.URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    setStatus("idle");
  }

  async function speakAnswer(text) {
    if (!voiceEnabled || !speechSupported || !text.trim()) {
      setStatus("idle");
      return;
    }

    stopSpeaking();
    setVoiceError("");
    setStatus("speaking");

    try {
      const controller = new AbortController();
      speechControllerRef.current = controller;
      const speechText = prepareHermesSpeechText(text).slice(0, MAX_SPEECH_TEXT_LENGTH);
      const response = await fetch("/api/marketing/hermes-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/wav" },
        credentials: "include",
        body: JSON.stringify({ text: speechText }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("speech_unavailable");

      const blob = await response.blob();
      if (!blob.size) throw new Error("empty_speech");
      const audioUrl = window.URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;
      audio.onended = () => stopSpeaking();
      audio.onerror = () => {
        setVoiceError("Не удалось воспроизвести голос. Текстовый ответ сохранён.");
        stopSpeaking();
      };
      await audio.play();
    } catch (speechError) {
      if (speechError?.name !== "AbortError") {
        setVoiceError("Голос Гермеса сейчас недоступен. Текстовый ответ сохранён.");
      }
      stopSpeaking();
    } finally {
      speechControllerRef.current = null;
    }
  }

  async function sendMessage(rawText) {
    const prompt = String(rawText || "").trim();
    if (!prompt || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setError("");
    setInput("");
    setStatus("thinking");
    setMessages((current) => [...current, createMessage("user", prompt)].slice(-MAX_HISTORY_MESSAGES));

    try {
      const controller = new AbortController();
      requestControllerRef.current = controller;
      const response = await fetch("/api/marketing/hermes-message", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        const message = response.status === 401
          ? "Сессия SuperSUS истекла. Обновите страницу и снова войдите."
          : payload?.error === "hermes_timeout"
            ? "Гермесу нужно больше времени. Повторите запрос через минуту."
            : "Гермес сейчас не ответил. Попробуйте ещё раз.";
        throw new Error(message);
      }

      const answer = String(payload?.answer || "").trim() || "Я не получил готовый ответ. Попробуйте уточнить вопрос.";
      setMessages((current) => [...current, createMessage("assistant", answer)].slice(-MAX_HISTORY_MESSAGES));
      setConnection("online");
      speakAnswer(answer);
    } catch (requestError) {
      if (requestError?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(requestError?.message || "Не удалось связаться с Гермесом.");
      setConnection("offline");
      setStatus("error");
    } finally {
      requestInFlightRef.current = false;
      requestControllerRef.current = null;
    }
  }

  function cancelRequest() {
    requestControllerRef.current?.abort?.();
    setStatus("idle");
    setError("");
  }

  function startListening() {
    if (status === "listening") {
      recognitionRef.current?.stop?.();
      return;
    }
    if (!recognitionSupported || status === "thinking") return;
    if (status === "speaking") stopSpeaking();

    const Recognition = getRecognitionConstructor();
    const recognition = new Recognition();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = true;
    pendingVoiceTextRef.current = "";
    latestVoiceTextRef.current = "";
    recognitionErrorRef.current = false;

    recognition.onstart = () => {
      setError("");
      setMicPermissionDenied(false);
      setStatus("listening");
    };
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const part = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalText += part;
        else interimText += part;
      }
      if (finalText.trim()) pendingVoiceTextRef.current = `${pendingVoiceTextRef.current} ${finalText}`.trim();
      const latestText = `${pendingVoiceTextRef.current} ${interimText}`.trim();
      latestVoiceTextRef.current = latestText;
      setInput(latestText);
    };
    recognition.onerror = (event) => {
      recognitionErrorRef.current = true;
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setMicPermissionDenied(denied);
      setError(denied ? "Микрофон заблокирован браузером." : "Не удалось распознать речь. Попробуйте ещё раз.");
      setStatus("error");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      const spokenText = resolveRecognizedSpeech(pendingVoiceTextRef.current, latestVoiceTextRef.current);
      if (recognitionErrorRef.current) return;
      if (spokenText) sendMessage(spokenText);
      else setStatus((current) => current === "listening" ? "idle" : current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function clearHistory() {
    if (!messages.length || !window.confirm("Очистить историю разговора на этом устройстве? Память Гермеса останется сохранённой.")) return;
    setMessages([]);
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <section className="hermes-assistant" aria-labelledby="hermes-assistant-title">
      <header className="hermes-assistant__header">
        <div>
          <span className="hermes-assistant__eyebrow">Hermes Core</span>
          <h2 id="hermes-assistant-title">Личный помощник Atlas</h2>
          <p>Голосовой доступ к задачам, решениям и общей памяти проекта.</p>
        </div>
        <button
          type="button"
          className={`hermes-assistant__connection hermes-assistant__connection--${connection}`}
          aria-label="Проверить связь Гермеса с памятью Atlas"
          onClick={checkConnection}
          title="Проверить соединение"
        >
          <span aria-hidden="true" />
          {connection === "online" ? "Память Atlas подключена" : connection === "offline" ? "Гермес недоступен" : "Проверяю связь"}
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </header>

      <div className="hermes-assistant__workspace">
        <section className="hermes-assistant__transcript" aria-label="История разговора">
          <div className="hermes-assistant__section-heading">
            <span><History size={18} aria-hidden="true" /> Разговор</span>
            <button type="button" onClick={clearHistory} disabled={!messages.length} title="Очистить локальную историю">
              <Trash2 size={17} aria-hidden="true" />
              <span>Очистить</span>
            </button>
          </div>
          <div className="hermes-assistant__messages" aria-live="polite">
            {!messages.length ? (
              <div className="hermes-assistant__empty">
                <BrainCircuit size={32} aria-hidden="true" />
                <strong>Гермес готов к разговору</strong>
                <span>Спросите о решениях, задачах или прошлых обсуждениях Atlas.</span>
              </div>
            ) : messages.map((message) => (
              <article key={message.id} className={`hermes-assistant__message hermes-assistant__message--${message.role}`}>
                <div>
                  <strong>{message.role === "assistant" ? "Гермес" : "Вы"}</strong>
                  <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                </div>
                <p>{message.text}</p>
              </article>
            ))}
            {status === "thinking" ? (
              <div className="hermes-assistant__thinking" role="status">
                <span /><span /><span />
                Гермес ищет ответ в памяти · {thinkingSeconds} сек
              </div>
            ) : null}
            <div ref={transcriptEndRef} />
          </div>
        </section>

        <section className={`hermes-assistant__core hermes-assistant__core--${status}`} aria-label="Голосовое управление">
          <div className="hermes-assistant__core-stage" aria-hidden="true">
            <span className="hermes-assistant__ring hermes-assistant__ring--outer" />
            <span className="hermes-assistant__ring hermes-assistant__ring--middle" />
            <span className="hermes-assistant__ring hermes-assistant__ring--inner" />
            <span className="hermes-assistant__core-mark"><BrainCircuit size={54} /></span>
          </div>
          <div className="hermes-assistant__status">
            <span>{statusCopy.label}</span>
            <strong>{status === "thinking" ? `${statusCopy.helper} · ${thinkingSeconds} сек` : statusCopy.helper}</strong>
          </div>
          <button
            type="button"
            className="hermes-assistant__voice-button"
            onClick={status === "thinking" ? cancelRequest : status === "speaking" ? stopSpeaking : startListening}
            disabled={!recognitionSupported && status !== "speaking" && status !== "thinking"}
          >
            {status === "thinking" || status === "listening" ? <Square size={22} fill="currentColor" aria-hidden="true" /> : status === "speaking" ? <VolumeX size={24} aria-hidden="true" /> : <Mic size={25} aria-hidden="true" />}
            <span>{status === "thinking" ? "Остановить запрос" : status === "listening" ? "Остановить" : status === "speaking" ? "Остановить ответ" : "Говорить с Гермесом"}</span>
          </button>
          <small>{recognitionSupported ? "Микрофон включается только после нажатия" : "В этом браузере доступен текстовый режим"}</small>
          {micPermissionDenied ? (
            <div className="hermes-assistant__mic-help" role="alert">
              <strong>Разрешите микрофон для этого сайта</strong>
              <span>Откройте настройки сайта рядом с адресной строкой, включите микрофон и нажмите «Проверить снова».</span>
              <button type="button" onClick={startListening}>Проверить снова</button>
            </div>
          ) : null}
        </section>

        <aside className="hermes-assistant__actions" aria-label="Быстрые запросы">
          <div className="hermes-assistant__section-heading">
            <span><BrainCircuit size={18} aria-hidden="true" /> Быстрые запросы</span>
          </div>
          <div className="hermes-assistant__quick-list">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={status === "thinking"}>
                {prompt}
              </button>
            ))}
          </div>
          <div className="hermes-assistant__voice-setting">
            <div>
              {voiceEnabled ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
              <span><strong>Спокойный голос</strong><small>Локальный голос Дмитрий · без передачи текста наружу</small></span>
            </div>
            <button type="button" role="switch" aria-checked={voiceEnabled} onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled((current) => !current);
            }} className={voiceEnabled ? "is-active" : ""} title="Переключить голосовой ответ">
              <span />
            </button>
          </div>
          <button
            type="button"
            className="hermes-assistant__replay-button"
            onClick={() => lastAssistantMessage && speakAnswer(lastAssistantMessage.text)}
            disabled={!lastAssistantMessage || !speechSupported || status === "thinking"}
          >
            <RotateCcw size={17} aria-hidden="true" />
            Повторить последний ответ
          </button>
        </aside>
      </div>

      <form className="hermes-assistant__composer" onSubmit={handleSubmit}>
        <label htmlFor="hermes-assistant-message">Сообщение Гермесу</label>
        <div>
          <textarea
            id="hermes-assistant-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Спросите о задачах, решениях или материалах Atlas..."
            rows={2}
            maxLength={12000}
          />
          <button type="submit" disabled={!input.trim() || status === "thinking"} aria-label="Отправить сообщение">
            <Send size={22} aria-hidden="true" />
          </button>
        </div>
        {error ? <p className="hermes-assistant__error" role="alert">{error}</p> : null}
        {voiceError ? <p className="hermes-assistant__voice-error" role="status">{voiceError}</p> : null}
      </form>
    </section>
  );
}
