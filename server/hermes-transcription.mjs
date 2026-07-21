function normalizeTranscriptionPayload(payload) {
  if (typeof payload === "string") {
    const value = payload.trim();
    if (!value) return "";
    try {
      return normalizeTranscriptionPayload(JSON.parse(value));
    } catch {
      return value;
    }
  }
  return String(payload?.text || payload?.transcript || "").trim();
}

export async function transcribeHermesAudio(audio, {
  url,
  contentType = "audio/webm",
  filename = "hermes-voice.webm",
  timeoutMs = 90000,
  fetchImpl = fetch,
} = {}) {
  if (!url) return { ok: false, status: 503, error: "transcription_not_configured" };
  if (!audio?.length) return { ok: false, status: 400, error: "empty_audio" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const endpoint = new URL(url);
    endpoint.searchParams.set("task", "transcribe");
    endpoint.searchParams.set("language", "ru");
    endpoint.searchParams.set("output", "json");
    endpoint.searchParams.set("encode", "true");
    endpoint.searchParams.set("vad_filter", "true");

    const form = new FormData();
    form.append("audio_file", new Blob([audio], { type: contentType }), filename);
    const response = await fetchImpl(endpoint, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: 503, error: "transcription_unavailable" };

    const responseType = String(response.headers.get("content-type") || "");
    const payload = responseType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : await response.text();
    const text = normalizeTranscriptionPayload(payload);
    if (!text) return { ok: false, status: 422, error: "speech_not_recognized" };
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      status: error?.name === "AbortError" ? 504 : 503,
      error: error?.name === "AbortError" ? "transcription_timeout" : "transcription_unavailable",
    };
  } finally {
    clearTimeout(timeout);
  }
}
