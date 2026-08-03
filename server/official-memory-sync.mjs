import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = process.env.ATLAS_OFFICIAL_MEMORY_DIR || "/opt/atlas-content-api/atlas-official-memory";
const CATALOG_FILE = process.env.ATLAS_OFFICIAL_MEMORY_CATALOG || path.join(CONTENT_DIR, "catalog.json");
const CURSOR_FILE = process.env.ATLAS_OFFICIAL_MEMORY_CURSOR_FILE
  || "/var/lib/atlas-analytics-content/official-memory-sync/cursors.json";
const HERMES_BRIDGE_URL = process.env.HERMES_BRIDGE_URL || "";
const HERMES_BRIDGE_TOKEN = process.env.HERMES_BRIDGE_TOKEN || "";
const HERMES_TIMEOUT_MS = Number(process.env.HERMES_BRIDGE_TIMEOUT_MS || 180_000);
const HERMES_LONG_TERM_MEMORY_READY = /^(1|true|yes|on)$/i.test(process.env.HERMES_LONG_TERM_MEMORY_READY || "");
const MAX_BATCHES = Math.max(1, Number(process.env.ATLAS_OFFICIAL_MEMORY_MAX_BATCHES || 40));
const MAX_BATCH_CHARACTERS = Math.max(8_000, Number(process.env.ATLAS_OFFICIAL_MEMORY_BATCH_CHARACTERS || 45_000));
const MAX_SOURCE_CHUNK_CHARACTERS = Math.max(4_000, Number(process.env.ATLAS_OFFICIAL_MEMORY_CHUNK_CHARACTERS || 16_000));

export function redactSensitiveText(value = "") {
  return String(value || "")
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{16,}\b/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/\b\d{7,12}:[A-Za-z0-9_-]{25,}\b/g, "[REDACTED_TELEGRAM_TOKEN]")
    .replace(/(^|\n)(\s*(?:password|passwd|secret|api[_ -]?key|access[_ -]?token|private[_ -]?key|пароль|приватный ключ)\s*[:=]\s*)[^\n]+/gim, "$1$2[REDACTED]");
}

export function splitSource(source, maxCharacters = MAX_SOURCE_CHUNK_CHARACTERS) {
  const content = redactSensitiveText(source.content || "");
  if (content.length <= maxCharacters) return [{ ...source, content, part: 1, parts: 1 }];
  const paragraphs = content.split(/\n{2,}/);
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxCharacters) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length > maxCharacters) {
      if (current) chunks.push(current);
      current = "";
      for (let index = 0; index < paragraph.length; index += maxCharacters) {
        chunks.push(paragraph.slice(index, index + maxCharacters));
      }
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks.map((chunk, index) => ({ ...source, content: chunk, part: index + 1, parts: chunks.length }));
}

export function buildMemoryPrompt(chunks, catalog) {
  const sources = chunks.map((chunk) => [
    `SOURCE ${chunk.id} part ${chunk.part}/${chunk.parts}`,
    `tier=${chunk.tier}; type=${chunk.type}; language=${chunk.language}; product_status=${chunk.productStatus || "not-applicable"}`,
    `title=${chunk.title}`,
    `url=${chunk.url}`,
    `version=${chunk.version}; fetched_at=${chunk.fetchedAt}; content_hash=${chunk.contentHash}`,
    "content:",
    chunk.content,
  ].join("\n"));
  return [
    "Это пакет проверенных официальных материалов Atlas System для долговременной памяти Hermes.",
    "Сохрани факты, определения, правила, риски, статусы продуктов, адреса контрактов, инструкции и ссылки на источники.",
    "При конфликте применяй приоритет A > B > C. Tier C годится только для датированных публикаций и не определяет механику, юридические условия или гарантии.",
    "Планируемые продукты не называй запущенными. Не превращай расчётную Delta в обещание дохода. Возврат и Delta не гарантированы и зависят от правил, действий участников и ликвидности.",
    "Новые версии из этого пакета заменяют устаревшие факты по той же теме. Всегда сохраняй URL и дату снимка.",
    "Активные защитные правила конфликтов:",
    ...(catalog.knownConflicts || []).map((item) => `- ${item.id}: ${item.handling}`),
    "",
    ...sources.flatMap((source) => [source, ""]),
    "Это внутренняя синхронизация. Ничего не отправляй в Telegram. Ответь одной строкой для технического лога: какие SOURCE приняты.",
  ].join("\n");
}

export async function materializeCatalog(catalog, outputDir) {
  const sourceDir = path.join(outputDir, "sources");
  await mkdir(sourceDir, { recursive: true });
  const index = [];
  for (const source of catalog.sources || []) {
    const file = `${safeId(source.id)}.md`;
    const body = [
      `# ${source.title}`,
      "",
      `- Source: ${source.url}`,
      `- Tier: ${source.tier}`,
      `- Type: ${source.type}`,
      `- Language: ${source.language}`,
      `- Product status: ${source.productStatus || "not-applicable"}`,
      `- Version: ${source.version}`,
      `- Fetched: ${source.fetchedAt}`,
      `- SHA-256: ${source.contentHash}`,
      "",
      redactSensitiveText(source.content),
      "",
    ].join("\n");
    await writeFile(path.join(sourceDir, file), body, { mode: 0o644 });
    index.push({ id: source.id, title: source.title, url: source.url, tier: source.tier, file: `sources/${file}` });
  }
  await writeFile(path.join(outputDir, "index.json"), `${JSON.stringify({ generatedAt: catalog.generatedAt, stats: catalog.stats, sources: index }, null, 2)}\n`, { mode: 0o644 });
  await writeFile(path.join(outputDir, "review-queue.json"), `${JSON.stringify(catalog.reviewQueue || [], null, 2)}\n`, { mode: 0o644 });
  return { sources: index.length, outputDir };
}

export async function syncOfficialMemory(options = {}) {
  if (!options.dryRun && !options.force && !HERMES_LONG_TERM_MEMORY_READY) {
    throw new Error("HERMES_LONG_TERM_MEMORY_READY=1 is required after Hindsight health verification");
  }
  const catalog = options.catalog || JSON.parse(await readFile(options.catalogFile || CATALOG_FILE, "utf8"));
  const cursorFile = options.cursorFile || CURSOR_FILE;
  const cursors = await readJson(cursorFile, { version: 1, sources: {} });
  const chunks = (catalog.sources || []).flatMap((source) => splitSource(source, options.chunkCharacters));
  const pending = chunks.filter((chunk) => {
    const key = `${chunk.id}:${chunk.part}`;
    return cursors.sources?.[key]?.contentHash !== chunk.contentHash
      || cursors.sources?.[key]?.parts !== chunk.parts;
  });
  const batches = batchChunks(pending, options.batchCharacters || MAX_BATCH_CHARACTERS)
    .slice(0, options.maxBatches || MAX_BATCHES);
  const results = [];
  for (const batch of batches) {
    const answer = options.dryRun ? "dry-run" : await sendToHermes(buildMemoryPrompt(batch, catalog), options);
    const syncedAt = new Date().toISOString();
    for (const chunk of batch) {
      cursors.sources[`${chunk.id}:${chunk.part}`] = {
        contentHash: chunk.contentHash,
        syncedAt,
        part: chunk.part,
        parts: chunk.parts,
        url: chunk.url,
      };
    }
    cursors.updatedAt = syncedAt;
    if (!options.dryRun) await writeJsonAtomic(cursorFile, cursors);
    results.push({ count: batch.length, sourceIds: [...new Set(batch.map((item) => item.id))], answer });
  }
  return { catalogSources: catalog.sources?.length || 0, chunks: chunks.length, pendingChunks: pending.length, syncedBatches: batches.length, results };
}

function batchChunks(chunks, maxCharacters) {
  const batches = [];
  let current = [];
  let size = 0;
  for (const chunk of chunks) {
    const nextSize = chunk.content.length + 800;
    if (current.length && size + nextSize > maxCharacters) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(chunk);
    size += nextSize;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function sendToHermes(prompt, options) {
  const bridgeUrl = options.bridgeUrl || HERMES_BRIDGE_URL;
  const bridgeToken = options.bridgeToken || HERMES_BRIDGE_TOKEN;
  if (!bridgeUrl || !bridgeToken) throw new Error("HERMES_BRIDGE_URL/HERMES_BRIDGE_TOKEN are required");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || HERMES_TIMEOUT_MS);
  try {
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${bridgeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        memoryOnly: true,
        memoryScope: "global",
        source: { chatId: "atlas-official-memory", chatTitle: "Atlas official knowledge", authorName: "Atlas official-source sync", memoryKind: "official", rawText: "", receivedAt: new Date().toISOString() },
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Hermes bridge HTTP ${response.status}`);
    return String(payload?.answer || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

function safeId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "").slice(0, 180);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const materialize = process.argv.find((value) => value.startsWith("--materialize="))?.slice(14);
  const catalogFile = process.argv.find((value) => value.startsWith("--catalog="))?.slice(10) || CATALOG_FILE;
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  const operation = materialize
    ? materializeCatalog(catalog, materialize)
    : syncOfficialMemory({ catalog, dryRun, force });
  operation.then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(`[official-memory-sync] ${error?.stack || error}`);
    process.exitCode = 1;
  });
}
