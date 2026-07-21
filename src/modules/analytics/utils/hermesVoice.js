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

export function resolveRecognizedSpeech(finalText, latestText) {
  return String(latestText || finalText || "").trim();
}
