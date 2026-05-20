import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";

const VIDEO_SCRIPTS_STORAGE_KEY = "atlas.analytics.videoScripts.v1";

const defaultVideoScripts = [
  {
    id: "registration-cycle",
    title: "Регистрация и создание смарт-цикла",
    duration: "30-45 секунд",
    format: "Короткая инструкция / вертикальный ролик",
    brief: "Показать путь новичка: открыть сайт, подключить MetaMask, выбрать Smart Cycle, подтвердить транзакцию и увидеть активный тикет помощи.",
    script:
      "Откройте Atlas System и нажмите «Подключить кошелёк». Регистрация проходит через MetaMask, без почты и пароля. После подключения выберите раздел Smart Cycle, укажите сумму и период участия, затем подтвердите действие в кошельке. После подтверждения в блокчейне в личном кабинете появится активный тикет помощи. Здесь можно отслеживать срок, статус и момент, когда будет доступен запрос помощи.",
  },
  {
    id: "smart-cycle",
    title: "Как работает Smart Cycle",
    duration: "60-90 секунд",
    format: "Объясняющий ролик / motion",
    brief: "Объяснить механику кассы взаимопомощи без слов «инвестиция» и «гарантия»: оказать помощь, дождаться периода, запросить помощь.",
    script:
      "Smart Cycle — это цифровой цикл взаимной помощи на базе smart-contract. Участник выбирает сумму и период, затем оказывает помощь системе через свой кошелёк. Правила цикла фиксируются программным кодом, а операция отображается в блокчейне. Когда период завершается, участник получает право запросить помощь у системы: сумму оказанной помощи и добавочную дельту по условиям цикла. Исполнение запроса зависит от правил smart-contract и доступной ликвидности.",
  },
  {
    id: "partner-program",
    title: "Партнёрская программа Invite & Earn",
    duration: "60-90 секунд",
    format: "Обучающий ролик для лидеров",
    brief: "Показать, как участник приглашает людей, строит структуру и получает начисления от добавочной помощи структуры.",
    script:
      "В Atlas действует единая партнёрская структура. После создания первого смарт-цикла участник получает возможность делиться системой через реферальную ссылку. Когда приглашённые участники создают свои тикеты помощи, партнёрская программа рассчитывает начисления по правилам статуса, структуры и компрессии. Начисления идут не от суммы оказанной помощи, а от добавочной помощи структуры. Чем активнее участник развивает команду и выполняет условия статуса, тем выше его процентная квалификация.",
  },
  {
    id: "atlas-ideology",
    title: "Идеология Atlas System",
    duration: "90-120 секунд",
    format: "Имиджевый ролик / манифест",
    brief: "Передать идею Atlas как цифровой кооперации и кассы взаимопомощи нового поколения.",
    script:
      "Atlas System — это цифровая касса взаимопомощи нового поколения. В мире, где старые модели доверия меняются, люди снова ищут прозрачные правила, технологию и силу объединения. Atlas переносит идею взаимной поддержки в Web3-среду: smart-contract фиксирует правила, участники видят свои действия в личном кабинете, а сообщество помогает развивать систему. Atlas строится не вокруг одного человека, а вокруг прозрачной архитектуры, участников и долгой игры.",
  },
  {
    id: "mutual-aid",
    title: "Касса взаимопомощи простыми словами",
    duration: "60 секунд",
    format: "FAQ / объяснение для новичка",
    brief: "Объяснить модель взаимопомощи через понятный образ: люди объединяют ресурсы и поддерживают друг друга по правилам.",
    script:
      "Касса взаимопомощи — это модель, где люди добровольно объединяют ресурсы, чтобы поддерживать друг друга. В Atlas эта логика перенесена в цифровую среду. Вместо ручного управления правила выполняет smart-contract. Участник оказывает помощь системе, выбирает период участия и видит свой смарт-цикл в кабинете. После выполнения условий он может запросить помощь обратно по правилам цикла. Важно понимать: Atlas не обещает гарантированный результат, а даёт прозрачную механику участия и понятные правила.",
  },
];

function readStoredVideos() {
  if (typeof window === "undefined") return defaultVideoScripts;

  try {
    const saved = window.localStorage.getItem(VIDEO_SCRIPTS_STORAGE_KEY);
    if (!saved) return defaultVideoScripts;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultVideoScripts;
  } catch {
    return defaultVideoScripts;
  }
}

function persistVideos(videos) {
  try {
    window.localStorage.setItem(VIDEO_SCRIPTS_STORAGE_KEY, JSON.stringify(videos));
  } catch {
    // Сценарии останутся доступны до перезагрузки даже без localStorage.
  }
}

function createVideoScript() {
  return {
    id: `video-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Новый ролик",
    duration: "",
    format: "",
    brief: "",
    script: "",
  };
}

function VideoScriptsBoard() {
  const [videos, setVideos] = useState(readStoredVideos);
  const [activeVideoId, setActiveVideoId] = useState(() => {
    if (typeof window === "undefined") return defaultVideoScripts[0]?.id || "";

    const url = new URL(window.location.href);
    return url.searchParams.get("video") || defaultVideoScripts[0]?.id || "";
  });

  const activeVideo = videos.find((video) => video.id === activeVideoId) || videos[0] || null;

  function updateVideos(updater) {
    setVideos((current) => {
      const next = updater(current);
      persistVideos(next);
      return next;
    });
  }

  function updateVideo(videoId, field, value) {
    updateVideos((current) => current.map((video) => (video.id === videoId ? { ...video, [field]: value } : video)));
  }

  function addVideo() {
    const nextVideo = createVideoScript();
    updateVideos((current) => [nextVideo, ...current]);
    setActiveVideoId(nextVideo.id);
  }

  function removeVideo(videoId) {
    updateVideos((current) => {
      const next = current.filter((video) => video.id !== videoId);
      if (!next.length) return defaultVideoScripts;
      if (activeVideoId === videoId) setActiveVideoId(next[0].id);
      return next;
    });
  }

  function resetVideos() {
    updateVideos(() => defaultVideoScripts);
    setActiveVideoId(defaultVideoScripts[0]?.id || "");
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeVideo) return;

    const url = new URL(window.location.href);
    url.searchParams.set("board", "videoScripts");
    url.searchParams.set("video", activeVideo.id);
    window.history.replaceState({}, "", url.toString());
  }, [activeVideo]);

  return (
    <section className="analytics-surface analytics-agent-template mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Ролики</span>
          <h2 className="analytics-agent-template-title">Сценарии и ТЗ для роликов</h2>
          <p className="analytics-page-subtitle mb-0">
            Здесь можно хранить тексты роликов, править сценарии, добавлять новые видео и держать рядом формат, длительность и комментарии к ТЗ.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <AnalyticsActionButton variant="secondary" size="sm" onClick={resetVideos}>
            Сбросить шаблон
          </AnalyticsActionButton>
          <AnalyticsActionButton variant="primary" size="sm" onClick={addVideo}>
            + ролик
          </AnalyticsActionButton>
        </div>
      </div>

      <div className="analytics-agent-template-tabs" role="tablist" aria-label="Сценарии роликов">
        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            role="tab"
            aria-selected={activeVideo?.id === video.id}
            className={`analytics-agent-template-tab${activeVideo?.id === video.id ? " analytics-agent-template-tab-active" : ""}`}
            onClick={() => setActiveVideoId(video.id)}
          >
            {video.title || "Без названия"}
          </button>
        ))}
      </div>

      {activeVideo ? (
        <div className="analytics-agent-template-grid">
          <div className="analytics-agent-template-card">
            <div className="analytics-agent-template-card-head">
              <h3>{activeVideo.title || "Без названия"}</h3>
              <AnalyticsActionButton variant="danger" size="sm" onClick={() => removeVideo(activeVideo.id)}>
                Удалить
              </AnalyticsActionButton>
            </div>

            <div className="row g-3">
              <label className="col-12 col-lg-6">
                <span className="analytics-kicker">Название ролика</span>
                <input
                  className="form-control analytics-launch-input"
                  value={activeVideo.title}
                  onChange={(event) => updateVideo(activeVideo.id, "title", event.target.value)}
                  placeholder="Например: Как работает Smart Cycle"
                />
              </label>
              <label className="col-12 col-md-6 col-lg-3">
                <span className="analytics-kicker">Длительность</span>
                <input
                  className="form-control analytics-launch-input"
                  value={activeVideo.duration}
                  onChange={(event) => updateVideo(activeVideo.id, "duration", event.target.value)}
                  placeholder="30-60 секунд"
                />
              </label>
              <label className="col-12 col-md-6 col-lg-3">
                <span className="analytics-kicker">Формат</span>
                <input
                  className="form-control analytics-launch-input"
                  value={activeVideo.format}
                  onChange={(event) => updateVideo(activeVideo.id, "format", event.target.value)}
                  placeholder="Reels / YouTube / motion"
                />
              </label>
              <label className="col-12">
                <span className="analytics-kicker">ТЗ / комментарий</span>
                <textarea
                  className="analytics-agent-template-input"
                  value={activeVideo.brief}
                  onChange={(event) => updateVideo(activeVideo.id, "brief", event.target.value)}
                  placeholder="Что должен объяснить ролик, кому он адресован, какие акценты важны"
                  rows="4"
                />
              </label>
              <label className="col-12">
                <span className="analytics-kicker">Текст ролика</span>
                <textarea
                  className="analytics-agent-template-input"
                  value={activeVideo.script}
                  onChange={(event) => updateVideo(activeVideo.id, "script", event.target.value)}
                  placeholder="Вставь или напиши сценарий ролика"
                  rows="14"
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default VideoScriptsBoard;
