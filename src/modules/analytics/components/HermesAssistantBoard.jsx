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
import { prepareHermesSpeechText } from "../utils/hermesVoice.js";
import "./HermesAssistantBoard.css";

const HISTORY_STORAGE_KEY = "atlas.hermes.assistantHistory.v1";
const MAX_HISTORY_MESSAGES = 40;
const MAX_SPEECH_TEXT_LENGTH = 3500;
const MAX_RECORDING_MS = 45_000;

const QUICK_PROMPTS = [
  "Что сегодня решили по Atlas?",
  "Какие задачи сейчас самые важные?",
  "Что обсуждали по продвижению Atlas?",
  "Собери краткий итог последних решений.",
];

const STATUS_COPY = {
  idle: { label: "Готов", helper: "Нажмите на микрофон и говорите" },
  listening: { label: "Слушаю", helper: "Говорите, затем нажмите ещё раз для отправки" },
  transcribing: { label: "Распознаю", helper: "Whisper переводит голос в текст" },
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
  const transcriptEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const recordingTimeoutRef = useRef(null);
  const transcriptionControllerRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const requestControllerRef = useRef(null);
  const speechControllerRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");

  const recognitionSupported = useMemo(() => Boolean(
    typeof window !== "undefined"
    && typeof window.MediaRecorder === "function"
    && window.navigator?.mediaDevices?.getUserMedia,
  ), []);
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
    window.clearTimeout(recordingTimeoutRef.current);
    mediaRecorderRef.current?.stop?.();
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    transcriptionControllerRef.current?.abort?.();
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
        headers: { "Content-Type": "application/json", Accept: "audio/*" },
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

  function stopRecording() {
    window.clearTimeout(recordingTimeoutRef.current);
    recordingTimeoutRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }

  function cancelTranscription() {
    transcriptionControllerRef.current?.abort?.();
    transcriptionControllerRef.current = null;
    setStatus("idle");
  }

  async function transcribeRecording(blob) {
    if (!blob?.size) {
      setError("Запись получилась пустой. Попробуйте ещё раз.");
      setStatus("error");
      return;
    }

    setStatus("transcribing");
    try {
      const controller = new AbortController();
      transcriptionControllerRef.current = controller;
      const response = await fetch("/api/marketing/hermes-transcription", {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm", Accept: "application/json" },
        credentials: "include",
        body: blob,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !String(payload?.text || "").trim()) {
        const message = payload?.error === "speech_not_recognized"
          ? "Не удалось разобрать речь. Произнесите вопрос чуть ближе к микрофону."
          : "Сервис распознавания голоса сейчас не ответил. Попробуйте ещё раз.";
        throw new Error(message);
      }
      const transcript = String(payload.text).trim();
      setInput(transcript);
      await sendMessage(transcript);
    } catch (transcriptionError) {
      if (transcriptionError?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(transcriptionError?.message || "Не удалось распознать голос.");
      setStatus("error");
    } finally {
      transcriptionControllerRef.current = null;
    }
  }

  async function startListening() {
    if (status === "listening") return stopRecording();
    if (!recognitionSupported || status === "thinking" || status === "transcribing") return;
    if (status === "speaking") stopSpeaking();

    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => window.MediaRecorder.isTypeSupported?.(type));
      const recorder = preferredType
        ? new window.MediaRecorder(stream, { mimeType: preferredType })
        : new window.MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      setError("");
      setMicPermissionDenied(false);
      setStatus("listening");
      recorder.ondataavailable = (event) => {
        if (event.data?.size) mediaChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("Не удалось записать голос. Попробуйте ещё раз.");
        setStatus("error");
      };
      recorder.onstop = () => {
        const recordedType = recorder.mimeType || preferredType || "audio/webm";
        const blob = new Blob(mediaChunksRef.current, { type: recordedType });
        mediaChunksRef.current = [];
        mediaRecorderRef.current = null;
        mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        transcribeRecording(blob);
      };
      recorder.start(250);
      recordingTimeoutRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (recordingError) {
      const denied = recordingError?.name === "NotAllowedError" || recordingError?.name === "SecurityError";
      setMicPermissionDenied(denied);
      setError(denied ? "Микрофон заблокирован браузером." : "Не удалось включить микрофон.");
      setStatus("error");
    }
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
            onClick={status === "thinking" ? cancelRequest : status === "transcribing" ? cancelTranscription : status === "speaking" ? stopSpeaking : startListening}
            disabled={!recognitionSupported && status !== "speaking" && status !== "thinking" && status !== "transcribing"}
          >
            {status === "thinking" || status === "listening" || status === "transcribing" ? <Square size={22} fill="currentColor" aria-hidden="true" /> : status === "speaking" ? <VolumeX size={24} aria-hidden="true" /> : <Mic size={25} aria-hidden="true" />}
            <span>{status === "thinking" ? "Остановить запрос" : status === "transcribing" ? "Отменить распознавание" : status === "listening" ? "Остановить и отправить" : status === "speaking" ? "Остановить ответ" : "Говорить с Гермесом"}</span>
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
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={status === "thinking" || status === "transcribing"}>
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
            disabled={!lastAssistantMessage || !speechSupported || status === "thinking" || status === "transcribing"}
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
          <button type="submit" disabled={!input.trim() || status === "thinking" || status === "transcribing"} aria-label="Отправить сообщение">
            <Send size={22} aria-hidden="true" />
          </button>
        </div>
        {error ? <p className="hermes-assistant__error" role="alert">{error}</p> : null}
        {voiceError ? <p className="hermes-assistant__voice-error" role="status">{voiceError}</p> : null}
      </form>
    </section>
  );
}
