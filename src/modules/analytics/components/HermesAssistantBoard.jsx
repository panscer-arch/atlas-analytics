import {
  BrainCircuit,
  History,
  Mic,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import "./HermesAssistantBoard.css";

const HISTORY_STORAGE_KEY = "atlas.hermes.assistantHistory.v1";
const MAX_HISTORY_MESSAGES = 40;

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

function getRussianVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => /^ru[-_]/i.test(voice.lang)) || voices[0] || null;
}

export default function HermesAssistantBoard() {
  const [messages, setMessages] = useState(readHistory);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const pendingVoiceTextRef = useRef("");
  const requestInFlightRef = useRef(false);

  const recognitionSupported = useMemo(() => Boolean(getRecognitionConstructor()), []);
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const statusCopy = STATUS_COPY[status] || STATUS_COPY.idle;

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)));
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
  }, []);

  function stopSpeaking() {
    window.speechSynthesis?.cancel?.();
    setStatus("idle");
  }

  function speakAnswer(text) {
    if (!voiceEnabled || !speechSupported || !text.trim()) {
      setStatus("idle");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ru-RU";
    utterance.rate = 1;
    utterance.pitch = 0.95;
    const voice = getRussianVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    window.speechSynthesis.speak(utterance);
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
      const response = await fetch("/api/marketing/hermes-message", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
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
      speakAnswer(answer);
    } catch (requestError) {
      setError(requestError?.message || "Не удалось связаться с Гермесом.");
      setStatus("error");
    } finally {
      requestInFlightRef.current = false;
    }
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

    recognition.onstart = () => {
      setError("");
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
      setInput(`${pendingVoiceTextRef.current} ${interimText}`.trim());
    };
    recognition.onerror = (event) => {
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setError(denied ? "Разрешите доступ к микрофону в настройках браузера." : "Не удалось распознать речь. Попробуйте ещё раз.");
      setStatus("error");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      const spokenText = pendingVoiceTextRef.current.trim();
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
        <div className="hermes-assistant__connection" aria-label="Гермес подключён к памяти Atlas">
          <span aria-hidden="true" />
          Память Atlas подключена
        </div>
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
                Гермес ищет ответ в памяти
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
            <strong>{statusCopy.helper}</strong>
          </div>
          <button
            type="button"
            className="hermes-assistant__voice-button"
            onClick={status === "speaking" ? stopSpeaking : startListening}
            disabled={status === "thinking" || (!recognitionSupported && status !== "speaking")}
          >
            {status === "listening" ? <Square size={22} fill="currentColor" aria-hidden="true" /> : status === "speaking" ? <VolumeX size={24} aria-hidden="true" /> : <Mic size={25} aria-hidden="true" />}
            <span>{status === "listening" ? "Остановить" : status === "speaking" ? "Остановить ответ" : "Говорить с Гермесом"}</span>
          </button>
          <small>{recognitionSupported ? "Микрофон включается только после нажатия" : "В этом браузере доступен текстовый режим"}</small>
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
              <span><strong>Голосовой ответ</strong><small>Озвучивать ответы Гермеса</small></span>
            </div>
            <button type="button" role="switch" aria-checked={voiceEnabled} onClick={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled((current) => !current);
            }} className={voiceEnabled ? "is-active" : ""} title="Переключить голосовой ответ">
              <span />
            </button>
          </div>
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
      </form>
    </section>
  );
}
