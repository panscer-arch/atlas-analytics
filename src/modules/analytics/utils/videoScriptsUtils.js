import { saveServerContent } from "../services/contentStore";
import { VIDEO_SCRIPTS_STORAGE_KEY, defaultVideoScripts } from "../data/videoScriptsData";

export const removedDefaultVideoIds = new Set(["registration-cycle", "smart-cycle", "partner-program", "atlas-ideology", "mutual-aid"]);

export function hydrateVideos(savedVideos) {
  if (!Array.isArray(savedVideos) || !savedVideos.length) return defaultVideoScripts;

  const savedVideosById = new Map(savedVideos.map((video) => [video.id, video]));
  const defaultVideos = defaultVideoScripts.map((defaultVideo) => ({
    ...defaultVideo,
    ...(savedVideosById.get(defaultVideo.id) || {}),
  }));
  const customVideos = savedVideos.filter(
    (video) => !removedDefaultVideoIds.has(video.id) && !defaultVideoScripts.some((defaultVideo) => defaultVideo.id === video.id),
  );

  return [...defaultVideos, ...customVideos];
}

export function readStoredVideos() {
  if (typeof window === "undefined") return defaultVideoScripts;

  try {
    const saved = window.localStorage.getItem(VIDEO_SCRIPTS_STORAGE_KEY);
    if (!saved) return defaultVideoScripts;

    const parsed = JSON.parse(saved);
    return hydrateVideos(parsed);
  } catch {
    return defaultVideoScripts;
  }
}

export function persistVideos(videos) {
  try {
    window.localStorage.setItem(VIDEO_SCRIPTS_STORAGE_KEY, JSON.stringify(videos));
    saveServerContent(VIDEO_SCRIPTS_STORAGE_KEY, videos);
  } catch {
    // Сценарии останутся доступны до перезагрузки даже без localStorage.
  }
}

export function createVideoScript() {
  return {
    id: `video-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "Новый ролик",
    duration: "",
    format: "",
    brief: "",
    script: "",
  };
}
