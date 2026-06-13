import { defaultWhitePaperBlocks } from "../data/whitePaperBlocks";
import { WHITE_PAPER_STORAGE_KEY } from "../data/whitePaperData";

export function getBlockView(block) {
  if (block.view) return block.view;
  if (block.id === "full-manifest") return "manifest";
  if (block.id?.startsWith("archive-")) return "archive";
  return "document";
}

export function normalizeBlock(block, index = 0) {
  return {
    id: block.id || `white-paper-${Date.now()}-${index}`,
    title: block.title || "Новый блок White Paper",
    sourceTitle: block.sourceTitle || block.title || "Новый блок White Paper",
    sectionNumber: block.sectionNumber || "",
    view: getBlockView(block),
    role: block.role || "Раздел",
    status: block.status || "Черновик",
    text: block.text || "",
    notes: block.notes || "",
    prompt: block.prompt || "",
    contentFormat: block.contentFormat || "text",
  };
}

export function mergeDefaultBlocks(savedBlocks = []) {
  const defaultBlocksById = new Map(defaultWhitePaperBlocks.map((block) => [block.id, normalizeBlock(block)]));
  const defaultOrderById = new Map(defaultWhitePaperBlocks.map((block, index) => [block.id, index]));
  const normalizedSavedBlocks = savedBlocks.map((block) => {
    const normalizedBlock = normalizeBlock(block);
    const defaultBlock = defaultBlocksById.get(normalizedBlock.id);
    if (!defaultBlock) return normalizedBlock;
    if (normalizedBlock.id.startsWith("wp20-") || normalizedBlock.id.startsWith("wp30-") || normalizedBlock.id.startsWith("wp40-") || normalizedBlock.id.startsWith("wp50-") || normalizedBlock.id.startsWith("wp50sc-") || normalizedBlock.id.startsWith("aave-")) {
      return {
        ...normalizedBlock,
        title: normalizedBlock.title || defaultBlock.title,
        sourceTitle: normalizedBlock.sourceTitle || defaultBlock.sourceTitle,
        sectionNumber: defaultBlock.sectionNumber,
        view: defaultBlock.view,
        role: normalizedBlock.role || defaultBlock.role,
        text: normalizedBlock.text || defaultBlock.text,
        notes: normalizedBlock.notes || defaultBlock.notes,
        prompt: normalizedBlock.prompt || defaultBlock.prompt,
        contentFormat: normalizedBlock.contentFormat || defaultBlock.contentFormat,
      };
    }
    return {
      ...normalizedBlock,
      text: normalizedBlock.text || defaultBlock.text,
      notes: normalizedBlock.notes || defaultBlock.notes,
      prompt: normalizedBlock.prompt || defaultBlock.prompt,
      contentFormat: normalizedBlock.contentFormat || defaultBlock.contentFormat,
    };
  });
  const savedIds = new Set(normalizedSavedBlocks.map((block) => block.id));
  const missingDefaults = defaultWhitePaperBlocks
    .filter((block) => !savedIds.has(block.id))
    .map(normalizeBlock);
  return [...normalizedSavedBlocks, ...missingDefaults].sort((a, b) => {
    const aOrder = defaultOrderById.has(a.id) ? defaultOrderById.get(a.id) : Number.POSITIVE_INFINITY;
    const bOrder = defaultOrderById.has(b.id) ? defaultOrderById.get(b.id) : Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return 0;
  });
}

export function readStoredBlocks() {
  if (typeof window === "undefined") return defaultWhitePaperBlocks;

  try {
    const saved = window.localStorage.getItem(WHITE_PAPER_STORAGE_KEY);
    return saved ? mergeDefaultBlocks(JSON.parse(saved)) : defaultWhitePaperBlocks;
  } catch {
    return defaultWhitePaperBlocks;
  }
}

export function hasStoredBlocks() {
  if (typeof window === "undefined") return false;

  try {
    return Boolean(window.localStorage.getItem(WHITE_PAPER_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function persistBlocksLocal(blocks) {
  try {
    window.localStorage.setItem(WHITE_PAPER_STORAGE_KEY, JSON.stringify(blocks));
  } catch {
    // Рабочая версия остаётся в состоянии страницы, даже если storage временно недоступен.
  }
}

export function getWhitePaperCoverLines(text = "") {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function findCoverValue(lines, label) {
  const prefix = `${label}:`;
  return lines.find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() || "";
}

export function findFirstCoverValue(lines, labels) {
  return labels.map((label) => findCoverValue(lines, label)).find(Boolean) || "";
}

export function getWhitePaperSubsections(block) {
  const lines = String(block?.text || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+\.\d+)\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = {
        id: `${block.id}-${match[1].replace(/\./g, "-")}`,
        number: match[1],
        title: match[2],
        lines: [trimmed],
      };
      return;
    }

    if (current) current.lines.push(line);
  });

  if (current) sections.push(current);

  return sections.map((section) => ({
    id: section.id,
    number: section.number,
    title: section.title,
    text: section.lines.join("\n").trim(),
  }));
}

export function replaceWhitePaperSubsectionText(blockText = "", subsection, nextText = "") {
  if (!subsection?.number) return nextText;

  const lines = String(blockText || "").split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim().match(new RegExp(`^${subsection.number.replace(".", "\\.")}\\s+`)));
  if (startIndex === -1) return blockText;

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^\d+\.\d+\s+/.test(lines[index].trim())) {
      endIndex = index;
      break;
    }
  }

  const nextLines = String(nextText || "").split(/\r?\n/);
  return [...lines.slice(0, startIndex), ...nextLines, ...lines.slice(endIndex)].join("\n");
}

export function isEditableKeyboardTarget(target) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function parseMarkdownTable(tableText = "") {
  const rows = String(tableText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
  if (!rows.length) return { headers: [], rows: [] };
  const [headers, maybeDivider, ...bodyRows] = rows;
  const hasDivider = maybeDivider?.every((cell) => /^:?-{2,}:?$/.test(cell));
  return {
    headers,
    rows: hasDivider ? bodyRows : rows.slice(1),
  };
}

export function getTableCellTone(value = "") {
  const normalized = value.toLowerCase();
  if (normalized.includes("нужно заполнить") || normalized.includes("требует")) return "warning";
  if (normalized.includes("подтвердить") || normalized.includes("сверки")) return "review";
  if (normalized.includes("предварительно") || normalized.includes("черновик")) return "draft";
  if (normalized.includes("заполнено") || normalized.includes("пройден")) return "ok";
  return "";
}

export function getWhitePaperTableRowTone(row = []) {
  const flow = String(row[0] || "").toLowerCase();
  if (flow.includes("daily")) return "daily";
  if (flow.includes("lock")) return "lockup";
  return "";
}
