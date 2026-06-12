import { useEffect, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import { loadServerContent, saveServerContent } from "../services/contentStore";

import { VIDEO_SCRIPTS_STORAGE_KEY, defaultVideoScripts } from "../data/videoScriptsData";
import { createVideoScript, hydrateVideos, persistVideos, readStoredVideos } from "../utils/videoScriptsUtils";

function VideoScriptsBoard() {
  const [videos, setVideos] = useState(readStoredVideos);
  const [editableVideoIds, setEditableVideoIds] = useState({});
  const [activeVideoId, setActiveVideoId] = useState(() => {
    if (typeof window === "undefined") return defaultVideoScripts[0]?.id || "";

    const url = new URL(window.location.href);
    return url.searchParams.get("video") || defaultVideoScripts[0]?.id || "";
  });

  const activeVideo = videos.find((video) => video.id === activeVideoId) || videos[0] || null;
  const isActiveVideoEditing = Boolean(activeVideo && editableVideoIds[activeVideo.id]);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(VIDEO_SCRIPTS_STORAGE_KEY).then((savedVideos) => {
      if (!isMounted || !savedVideos) return;
      setVideos(hydrateVideos(savedVideos));
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
    setEditableVideoIds((current) => {
      const next = { ...current };
      delete next[videoId];
      return next;
    });
  }

  function toggleVideoEditing(videoId) {
    setEditableVideoIds((current) => ({ ...current, [videoId]: !current[videoId] }));
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
    <section className="analytics-surface analytics-agent-template">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">Ролики</span>
          <h2 className="analytics-agent-template-title">Сценарии и ТЗ для роликов</h2>
          <p className="analytics-page-subtitle">
            Здесь можно хранить тексты роликов, править сценарии, добавлять новые видео и держать рядом формат, длительность и комментарии к ТЗ.
          </p>
        </div>
        <div className="analytics-action-row">
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
              <div className="analytics-action-row">
                <AnalyticsActionButton variant={isActiveVideoEditing ? "secondary" : "primary"} size="sm" onClick={() => toggleVideoEditing(activeVideo.id)}>
                  {isActiveVideoEditing ? "Готово" : "Редактировать"}
                </AnalyticsActionButton>
                <AnalyticsActionButton variant="danger" size="sm" onClick={() => removeVideo(activeVideo.id)}>
                  Удалить
                </AnalyticsActionButton>
              </div>
            </div>
            <p className="analytics-video-edit-hint">
              {isActiveVideoEditing
                ? "Режим редактирования включён. Изменения автоматически сохраняются в этом браузере."
                : "Чтобы править текст ролика, нажмите «Редактировать». Так финальный текст не изменится случайно."}
            </p>

            <LayoutGrid columns="four" gap="md">
              <LayoutCell span="half">
                <label className="analytics-video-field">
                <span className="analytics-kicker">Название ролика</span>
                <input
                  className="analytics-launch-input"
                  value={activeVideo.title}
                  onChange={(event) => updateVideo(activeVideo.id, "title", event.target.value)}
                  readOnly={!isActiveVideoEditing}
                  placeholder="Например: Как работает Smart Cycle"
                />
                </label>
              </LayoutCell>
              <LayoutCell>
                <label className="analytics-video-field">
                <span className="analytics-kicker">Длительность</span>
                <input
                  className="analytics-launch-input"
                  value={activeVideo.duration}
                  onChange={(event) => updateVideo(activeVideo.id, "duration", event.target.value)}
                  readOnly={!isActiveVideoEditing}
                  placeholder="30-60 секунд"
                />
                </label>
              </LayoutCell>
              <LayoutCell>
                <label className="analytics-video-field">
                <span className="analytics-kicker">Формат</span>
                <input
                  className="analytics-launch-input"
                  value={activeVideo.format}
                  onChange={(event) => updateVideo(activeVideo.id, "format", event.target.value)}
                  readOnly={!isActiveVideoEditing}
                  placeholder="Reels / YouTube / motion"
                />
                </label>
              </LayoutCell>
              <LayoutCell span="full">
                <label className="analytics-video-field">
                <span className="analytics-kicker">ТЗ / комментарий</span>
                <textarea
                  className="analytics-agent-template-input"
                  value={activeVideo.brief}
                  onChange={(event) => updateVideo(activeVideo.id, "brief", event.target.value)}
                  readOnly={!isActiveVideoEditing}
                  placeholder="Что должен объяснить ролик, кому он адресован, какие акценты важны"
                  rows="4"
                />
                </label>
              </LayoutCell>
              <LayoutCell span="full">
                <label className="analytics-video-field">
                <span className="analytics-kicker">Текст ролика</span>
                <textarea
                  className="analytics-agent-template-input"
                  value={activeVideo.script}
                  onChange={(event) => updateVideo(activeVideo.id, "script", event.target.value)}
                  readOnly={!isActiveVideoEditing}
                  placeholder="Вставь или напиши сценарий ролика"
                  rows="14"
                />
                </label>
              </LayoutCell>
            </LayoutGrid>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default VideoScriptsBoard;
