import { saveServerContent } from "../services/contentStore";
import {
  PRESENTATION_FRAME_DRAFTS_STORAGE_KEY,
  PRESENTATION_SCRIPT_DRAFTS_STORAGE_KEY,
  PRESENTATION_VISUAL_DRAFTS_STORAGE_KEY,
  SMART_CYCLE_TARIFFS,
} from "../data/presentationData";

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxLength = 52) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.slice(0, 5);
}

function formatFrameTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.max(0, Math.round(seconds % 60));
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function makeFrameTiming(index, total, durationSeconds) {
  const start = Math.round((durationSeconds / total) * index);
  const end = Math.round((durationSeconds / total) * (index + 1));
  return `${formatFrameTime(start)}–${formatFrameTime(end)}`;
}

function makeFrameTitleFromText(text, fallback) {
  const clean = String(text)
    .replace(/\s+/g, " ")
    .replace(/[“”"«»]/g, "")
    .trim();
  if (!clean) return fallback;

  const sentence = clean.split(/[.!?]/).find((part) => part.trim().length > 10) || clean;
  const words = sentence.trim().split(/\s+/).slice(0, 8).join(" ");
  return words.length > 64 ? `${words.slice(0, 61)}...` : words;
}

export function getDraftShiftToken(seed) {
  const normalizedSeed = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  return Math.abs(normalizedSeed) % 7;
}

export function splitScriptIntoFramePlan(slide, script, visual, stats) {
  const paragraphs = String(script)
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const words = countWords(script);
  const durationSeconds = Math.max(40, Math.round((words / 130) * 60));
  const targetFrameCount = Math.min(12, Math.max(4, Math.round(durationSeconds / 15)));
  const sourceParts = paragraphs.length ? paragraphs : [script];
  const frameCount = Math.min(targetFrameCount, Math.max(1, sourceParts.length));
  const buckets = Array.from({ length: frameCount }, () => []);

  sourceParts.forEach((part, index) => {
    const bucketIndex = Math.min(frameCount - 1, Math.floor((index / sourceParts.length) * frameCount));
    buckets[bucketIndex].push(part);
  });

  return buckets.map((bucket, index) => {
    const narration = bucket.join("\n\n");
    const mode = index === 0 || index === frameCount - 1 || index % 4 === 0 ? "Архитектор" : "Смысловой слайд";
    const title = makeFrameTitleFromText(narration, `${slide.title}: кадр ${index + 1}`);

    return {
      id: `${slide.id}-frame-${String(index + 1).padStart(2, "0")}`,
      mode,
      title,
      titleEn: `Frame ${index + 1}: source beat`,
      timing: makeFrameTiming(index, frameCount, durationSeconds),
      narration,
      narrationEn:
        "Translate this narration meaning into English for the final video and keep the same semantic accent from the Russian source.",
      visual:
        `${visual} Смысл кадра: ${title}. Визуализировать именно этот фрагмент речи Архитектора, без лишнего текста и без перегруза деталями.`,
      visualEn:
        "Dark premium Atlas production frame based on this source narration beat. Translate the meaning into English for final on-slide text, keep text concise and readable, and preserve the Atlas graphite/orange brand style.",
      sourceSlideId: slide.id,
      sourceSlideNumber: slide.number,
    };
  });
}

function renderSvgLines(lines, x, y, options = {}) {
  const { size = 34, lineHeight = 46, weight = 700, fill = "#dce7f7", opacity = 1 } = options;
  return lines
    .map((line, index) => (
      `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" opacity="${opacity}" font-size="${size}" font-weight="${weight}" font-family="Inter, Arial, sans-serif">${escapeSvg(line)}</text>`
    ))
    .join("");
}

export function getFrameLocale(frame, language) {
  if (language === "en") {
    return {
      title: frame.titleEn || frame.title,
      narration: frame.narrationEn || frame.narration,
      visual: frame.visualEn || frame.visual,
      mode: frame.mode === "Архитектор" ? "Architect" : frame.mode === "Финальный слайд" ? "Final slide" : "Meaning slide",
      stageLabel: "ENGLISH SOURCE",
      helpAction: "provided help",
      deltaLabel: "$5 delta",
      cycleSteps: ["Provide Help", "Wait term", "Completed", "Request Help", "Liquidity check"],
      tariffExamples: ["$100.30", "$102", "$105", "$112", "$122.50"],
    };
  }

  return {
    title: frame.title,
    narration: frame.narration,
    visual: frame.visual,
    mode: frame.mode,
    stageLabel: "РУССКАЯ ВЫЧИТКА",
    helpAction: "оказал помощь",
    deltaLabel: "$5 дельта",
    cycleSteps: ["Оказать помощь", "Ожидание срока", "Завершение", "Запросить помощь", "Проверка ликвидности"],
    tariffExamples: ["$100,30", "$102", "$105", "$112", "$122,50"],
  };
}

export function buildFrameDraftSvg(frame, index, seed = 1, language = "en") {
  const locale = getFrameLocale(frame, language);
  const accent = index % 2 === 0 ? "#f26614" : "#ffb13b";
  const altAccent = index % 3 === 0 ? "#7bb4ff" : "#ffd39a";
  const titleLines = wrapText(locale.title, 28);
  const narrationLines = wrapText(locale.narration, 56);
  const visualLines = wrapText(locale.visual, 68);
  const isArchitect = frame.mode === "Архитектор";
  const isTariff = frame.id === "03-09";
  const isExample = frame.id === "03-08";
  const isCycle = frame.id === "03-10";

  const networkNodes = Array.from({ length: 26 }, (_, nodeIndex) => {
    const x = 145 + ((nodeIndex * 79 + seed * 31) % 1120);
    const y = 145 + ((nodeIndex * 43 + seed * 19) % 470);
    const r = 4 + (nodeIndex % 4);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" opacity="${0.35 + (nodeIndex % 5) * 0.08}" />`;
  }).join("");

  const networkLines = Array.from({ length: 18 }, (_, lineIndex) => {
    const x1 = 160 + ((lineIndex * 101 + seed * 17) % 1080);
    const y1 = 160 + ((lineIndex * 67 + seed * 23) % 430);
    const x2 = 160 + (((lineIndex + 5) * 101 + seed * 17) % 1080);
    const y2 = 160 + (((lineIndex + 3) * 67 + seed * 23) % 430);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent}" stroke-width="1.5" opacity="0.16" />`;
  }).join("");

  const architectLayer = isArchitect
    ? `
      <ellipse cx="880" cy="220" rx="155" ry="48" fill="#ffe1bb" opacity="0.22" filter="url(#blur)" />
      <path d="M808 682 C812 538 836 446 888 408 C934 374 990 374 1038 408 C1090 449 1116 540 1120 682 Z" fill="#e9e3d8" opacity="0.86"/>
      <path d="M880 244 C940 226 1004 246 1020 320 C1034 383 994 448 936 458 C870 468 812 422 806 354 C800 300 828 260 880 244 Z" fill="#120b08"/>
      <path d="M807 682 C848 545 902 486 962 474 C912 558 890 620 874 682 Z" fill="#ffffff" opacity="0.38"/>
      <rect x="116" y="510" width="480" height="92" rx="18" fill="rgba(5,8,13,0.72)" stroke="${accent}" stroke-width="2"/>
      <text x="144" y="547" fill="${accent}" font-size="24" font-weight="900" letter-spacing="3" font-family="Inter, Arial, sans-serif">${language === "en" ? "ARCHITECT" : "АРХИТЕКТОР"}</text>
      <text x="144" y="580" fill="#fff1dc" font-size="28" font-weight="900" font-family="Inter, Arial, sans-serif">${escapeSvg(locale.title)}</text>
    `
    : "";

  const tariffLayer = isTariff
    ? `
      <g transform="translate(118 386)">
        ${SMART_CYCLE_TARIFFS.map((tariff, tariffIndex) => {
          const x = tariffIndex * 210;
          const example = locale.tariffExamples[tariffIndex];
          const term = language === "en" ? tariff.termEn : tariff.term;
          return `
            <rect x="${x}" y="0" width="178" height="132" rx="22" fill="rgba(255,255,255,0.06)" stroke="${tariffIndex === 2 ? accent : "rgba(255,211,154,0.28)"}" stroke-width="${tariffIndex === 2 ? 3 : 1.5}"/>
            <text x="${x + 24}" y="42" fill="#aebddb" font-size="22" font-weight="800" font-family="Inter, Arial, sans-serif">${escapeSvg(term)}</text>
            <text x="${x + 24}" y="82" fill="#ffd39a" font-size="36" font-weight="950" font-family="Inter, Arial, sans-serif">${tariff.delta}</text>
            <text x="${x + 24}" y="112" fill="#f5f8ff" font-size="20" font-weight="800" font-family="Inter, Arial, sans-serif">${example}</text>
          `;
        }).join("")}
      </g>
    `
    : "";

  const exampleLayer = isExample
    ? `
      <g transform="translate(154 394)">
        <rect x="0" y="0" width="260" height="128" rx="24" fill="rgba(255,255,255,0.07)" stroke="rgba(255,211,154,0.28)"/>
        <text x="34" y="56" fill="#fff" font-size="46" font-weight="950" font-family="Inter, Arial, sans-serif">$100</text>
        <text x="34" y="92" fill="#aebddb" font-size="22" font-weight="800" font-family="Inter, Arial, sans-serif">${escapeSvg(locale.helpAction)}</text>
        <path d="M304 62 H510" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
        <path d="M510 62 l-34 -24 v48 Z" fill="${accent}"/>
        <rect x="548" y="0" width="260" height="128" rx="24" fill="rgba(242,102,20,0.13)" stroke="${accent}" stroke-width="2"/>
        <text x="582" y="56" fill="#ffd39a" font-size="46" font-weight="950" font-family="Inter, Arial, sans-serif">${language === "en" ? "10 days" : "10 дней"}</text>
        <text x="582" y="92" fill="#fff" font-size="22" font-weight="800" font-family="Inter, Arial, sans-serif">Smart Cycle</text>
        <path d="M850 62 H1058" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
        <path d="M1058 62 l-34 -24 v48 Z" fill="${accent}"/>
        <text x="1094" y="57" fill="#fff" font-size="46" font-weight="950" font-family="Inter, Arial, sans-serif">$105</text>
        <text x="1094" y="94" fill="#ffd39a" font-size="22" font-weight="900" font-family="Inter, Arial, sans-serif">${escapeSvg(locale.deltaLabel)}</text>
      </g>
    `
    : "";

  const cycleLayer = isCycle
    ? `
      <g transform="translate(118 396)" fill="none" stroke="${accent}" stroke-width="2.5">
        ${locale.cycleSteps.map((label, stepIndex) => {
          const x = stepIndex * 218;
          return `
            <rect x="${x}" y="0" width="178" height="94" rx="20" fill="rgba(255,255,255,0.055)" />
            <text x="${x + 89}" y="40" fill="#fff1dc" text-anchor="middle" font-size="20" font-weight="900" font-family="Inter, Arial, sans-serif">${escapeSvg(label)}</text>
            <circle cx="${x + 89}" cy="68" r="9" fill="${accent}" stroke="none"/>
            ${stepIndex < 4 ? `<path d="M${x + 184} 47 H${x + 214}" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>` : ""}
          `;
        }).join("")}
      </g>
    `
    : "";

  const genericLayer = !isArchitect && !isTariff && !isExample && !isCycle
    ? `
      <circle cx="698" cy="408" r="116" fill="rgba(242,102,20,0.08)" stroke="${accent}" stroke-width="3"/>
      <circle cx="698" cy="408" r="62" fill="rgba(255,177,59,0.18)" stroke="${altAccent}" stroke-width="2"/>
      <text x="698" y="402" fill="#fff1dc" text-anchor="middle" font-size="26" font-weight="950" font-family="Inter, Arial, sans-serif">ATLAS</text>
      <text x="698" y="434" fill="${accent}" text-anchor="middle" font-size="23" font-weight="950" font-family="Inter, Arial, sans-serif">SYSTEM</text>
    `
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <defs>
      <filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
      <radialGradient id="bgGlow" cx="72%" cy="18%" r="74%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.22"/>
        <stop offset="45%" stop-color="#11151f" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#05070b"/>
      </radialGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#bgGlow)"/>
    <rect width="1600" height="900" fill="#05070b" opacity="0.52"/>
    <g opacity="0.95">${networkLines}${networkNodes}</g>
    <text x="88" y="92" fill="${accent}" font-size="24" font-weight="950" letter-spacing="8" font-family="Inter, Arial, sans-serif">ATLAS SYSTEM</text>
    <text x="88" y="137" fill="#7bb4ff" font-size="20" font-weight="900" letter-spacing="5" font-family="Inter, Arial, sans-serif">SLIDE 03 / FRAME ${String(index + 1).padStart(2, "0")} / ${escapeSvg(locale.stageLabel)}</text>
    ${renderSvgLines(titleLines, 88, 230, { size: 58, lineHeight: 66, weight: 950, fill: "#f7fbff" })}
    ${renderSvgLines(narrationLines, 92, 676, { size: 30, lineHeight: 40, weight: 760, fill: "#dce7f7", opacity: 0.92 })}
    ${renderSvgLines(visualLines, 1120, 708, { size: 19, lineHeight: 28, weight: 650, fill: "#9fb2cf", opacity: 0.72 })}
    <rect x="88" y="770" width="820" height="6" rx="3" fill="${accent}" opacity="0.84"/>
    ${architectLayer}
    ${tariffLayer}
    ${exampleLayer}
    ${cycleLayer}
    ${genericLayer}
  </svg>`;
}

export function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildFramePrompt(slide, frame, index, visual, notes, language = "en") {
  const locale = getFrameLocale(frame, language);
  const totalFrames = frame.totalFrames || 1;
  return [
    `Create frame ${index + 1} of ${totalFrames} for Atlas System CEO presentation, slide ${slide.number}: ${slide.title}.`,
    `Frame language: ${language === "en" ? "English source. All readable on-slide text must be in English." : "Russian proofreading layer. Readable on-slide text may be Russian only for review."}`,
    `Frame type: ${locale.mode}. Frame title: ${locale.title}. Approx timing: ${frame.timing}.`,
    `Narration meaning for this frame: ${locale.narration}`,
    `Frame visual direction: ${locale.visual}`,
    `Base slide visual direction: ${visual}`,
    notes ? `Additional designer notes: ${notes}` : "",
    "Keep one unified Atlas brand style across all frames: dark premium graphite background, warm orange/yellow Atlas accents, clean network architecture, serious CEO production still, realistic and cinematic.",
    "Use the Atlas logo/reference only as brand identity, not as clutter. Text must be large and readable if present. Avoid cartoon style, criminal hacker look, stock-photo feeling, excessive small UI text, and exaggerated profit imagery.",
  ].filter(Boolean).join(" ");
}

export function readStoredScriptDrafts() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(PRESENTATION_SCRIPT_DRAFTS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function readStoredVisualDrafts() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(PRESENTATION_VISUAL_DRAFTS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function readStoredFrameDrafts() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(PRESENTATION_FRAME_DRAFTS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function persistScriptDrafts(nextDrafts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRESENTATION_SCRIPT_DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
  saveServerContent(PRESENTATION_SCRIPT_DRAFTS_STORAGE_KEY, nextDrafts);
}

export function persistVisualDrafts(nextDrafts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRESENTATION_VISUAL_DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
  saveServerContent(PRESENTATION_VISUAL_DRAFTS_STORAGE_KEY, nextDrafts);
}

export function persistFrameDrafts(nextDrafts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRESENTATION_FRAME_DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
  saveServerContent(PRESENTATION_FRAME_DRAFTS_STORAGE_KEY, nextDrafts);
}
