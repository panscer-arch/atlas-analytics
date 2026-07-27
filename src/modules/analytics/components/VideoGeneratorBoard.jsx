import {
  Captions,
  Clapperboard,
  ExternalLink,
  FileText,
  Images,
  Mic2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import "./VideoGeneratorBoard.css";

const VIDEO_GENERATOR_URL = "/video-generator/";
const VIDEO_GENERATOR_HEALTH_URL = "/video-generator-health";

const PIPELINE_STEPS = [
  { icon: FileText, label: "Сценарий" },
  { icon: Mic2, label: "Озвучка" },
  { icon: Images, label: "Видеоряд" },
  { icon: Captions, label: "Субтитры" },
  { icon: Clapperboard, label: "MP4" },
];

function VideoGeneratorBoard() {
  const [serviceState, setServiceState] = useState("checking");

  const checkService = useCallback(async () => {
    setServiceState("checking");

    try {
      const response = await fetch(VIDEO_GENERATOR_HEALTH_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      const payload = (await response.text()).trim().toLowerCase();
      setServiceState(response.ok && payload === "ok" ? "online" : "offline");
    } catch {
      setServiceState("offline");
    }
  }, []);

  useEffect(() => {
    checkService();
  }, [checkService]);

  const isOnline = serviceState === "online";
  const stateLabel = serviceState === "checking"
    ? "Проверяю сервис"
    : isOnline
      ? "Готов к работе"
      : "Сервис недоступен";

  return (
    <section className="video-generator-board">
      <div className="video-generator-hero">
        <div className="video-generator-copy">
          <div className="video-generator-kicker">
            <span className={`video-generator-status-dot video-generator-status-dot-${serviceState}`} />
            {stateLabel}
          </div>
          <h2>Генерация видео</h2>
          <p>Собирай короткие ролики из сценария, озвучки, медиаматериалов и субтитров в одном рабочем окне.</p>
          <div className="video-generator-actions">
            <a
              className={`video-generator-open${isOnline ? "" : " video-generator-open-disabled"}`}
              href={isOnline ? VIDEO_GENERATOR_URL : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!isOnline}
            >
              <Clapperboard size={19} aria-hidden="true" />
              Открыть генератор
              <ExternalLink size={17} aria-hidden="true" />
            </a>
            <button type="button" className="video-generator-refresh" onClick={checkService} disabled={serviceState === "checking"}>
              <RefreshCw className={serviceState === "checking" ? "video-generator-spin" : ""} size={18} aria-hidden="true" />
              Обновить статус
            </button>
          </div>
        </div>

        <div className="video-generator-mark" aria-hidden="true">
          <div className="video-generator-frame">
            <span />
            <Clapperboard size={58} strokeWidth={1.5} />
          </div>
          <small>MoneyPrinterTurbo</small>
        </div>
      </div>

      <div className="video-generator-pipeline" aria-label="Этапы подготовки видео">
        {PIPELINE_STEPS.map(({ icon: Icon, label }, index) => (
          <div className="video-generator-step" key={label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <Icon size={22} aria-hidden="true" />
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      <div className="video-generator-note">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>Изолированный рабочий сервис</strong>
          <span>Доступ защищён паролем SuperSUS. Рендер выполняется отдельно от основного сайта и API.</span>
        </div>
      </div>
    </section>
  );
}

export default VideoGeneratorBoard;
