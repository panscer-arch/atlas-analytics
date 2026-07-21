export function prepareHermesSpeechText(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*#_>~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function synthesizeHermesSpeech(text, {
  url,
  timeoutMs = 60000,
  maxAudioBytes = 12 * 1024 * 1024,
  fetchImpl = fetch,
} = {}) {
  if (!url) return { ok: false, status: 503, error: "speech_not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/wav" },
      body: JSON.stringify({ text, length_scale: 1.12 }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: 503, error: "speech_unavailable" };

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxAudioBytes) {
      return { ok: false, status: 413, error: "speech_too_large" };
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length || audio.length > maxAudioBytes) {
      return { ok: false, status: audio.length ? 413 : 502, error: audio.length ? "speech_too_large" : "empty_speech" };
    }
    return { ok: true, audio };
  } catch (error) {
    return {
      ok: false,
      status: error?.name === "AbortError" ? 504 : 503,
      error: error?.name === "AbortError" ? "speech_timeout" : "speech_unavailable",
    };
  } finally {
    clearTimeout(timeout);
  }
}
