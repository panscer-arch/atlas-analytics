import { defaultAtlasFunnel, funnelStatusOptions, itemStatusOptions } from "../data/atlasFunnelData.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeCollection(defaultItems, savedItems) {
  const normalizedSaved = Array.isArray(savedItems) ? savedItems : [];
  const savedById = new Map(normalizedSaved.filter((item) => item?.id).map((item) => [item.id, item]));
  const mergedDefaults = defaultItems.map((item) => ({ ...item, ...(savedById.get(item.id) || {}) }));
  const customItems = normalizedSaved.filter((item) => item?.id && !defaultItems.some((defaultItem) => defaultItem.id === item.id));
  return [...mergedDefaults, ...customItems];
}

export function hydrateAtlasFunnel(saved) {
  const defaults = clone(defaultAtlasFunnel);
  if (!saved || typeof saved !== "object") return defaults;

  return {
    ...defaults,
    ...saved,
    version: defaults.version,
    meta: {
      ...defaults.meta,
      ...(saved.meta || {}),
      status: funnelStatusOptions.includes(saved?.meta?.status) ? saved.meta.status : defaults.meta.status,
    },
    stages: mergeCollection(defaults.stages, saved.stages),
    acquisitionSegments: mergeCollection(defaults.acquisitionSegments, saved.acquisitionSegments),
    audienceRoles: mergeCollection(defaults.audienceRoles, saved.audienceRoles),
    segments: mergeCollection(defaults.segments, saved.segments),
    sequence: mergeCollection(defaults.sequence, saved.sequence),
    assets: mergeCollection(defaults.assets, saved.assets),
    checklist: mergeCollection(defaults.checklist, saved.checklist),
    metrics: mergeCollection(defaults.metrics, saved.metrics),
    experiments: mergeCollection(defaults.experiments, saved.experiments),
  };
}

export function normalizeItemStatus(status) {
  return itemStatusOptions.includes(status) ? status : itemStatusOptions[0];
}

export function calculateFunnelStats(funnel) {
  const checklist = Array.isArray(funnel?.checklist) ? funnel.checklist : [];
  const required = checklist.filter((item) => item.required !== false);
  const completed = required.filter((item) => item.status === "Готово");
  const assets = Array.isArray(funnel?.assets) ? funnel.assets : [];
  const readyAssets = assets.filter((item) => item.status === "Готово");
  const sequence = Array.isArray(funnel?.sequence) ? funnel.sequence : [];
  const approvedSequence = sequence.filter((item) => item.approved);

  return {
    readiness: required.length ? Math.round((completed.length / required.length) * 100) : 0,
    completedGates: completed.length,
    requiredGates: required.length,
    readyAssets: readyAssets.length,
    totalAssets: assets.length,
    approvedMessages: approvedSequence.length,
    totalMessages: sequence.length,
  };
}

export function calculateMetricRows(metrics = []) {
  return metrics.map((metric, index) => {
    const previous = metrics[index - 1];
    const current = Math.max(0, Number(metric.current) || 0);
    const target = Math.max(0, Number(metric.target) || 0);
    const previousCurrent = Math.max(0, Number(previous?.current) || 0);
    const conversion = index === 0 ? 100 : previousCurrent > 0 ? (current / previousCurrent) * 100 : 0;
    const targetProgress = target > 0 ? Math.min((current / target) * 100, 999) : 0;
    return {
      ...metric,
      current,
      target,
      conversion,
      targetProgress,
    };
  });
}

export function buildAtlasFunnelMarkdown(funnel) {
  const meta = funnel.meta || {};
  const lines = [
    `# ${meta.name || "Atlas Web3 Start"}`,
    "",
    `Статус: ${meta.status || "Сборка"}`,
    `Ответственный: ${meta.owner || "Не назначен"}`,
    `Основной канал: ${meta.primaryChannel || "Не выбран"}`,
    `Источники: ${meta.trafficSources || "Не заполнено"}`,
    "",
    "## Стратегия",
    "",
    `**Аудитория:** ${meta.audience || ""}`,
    `**Обещание:** ${meta.promise || ""}`,
    `**Цель:** ${meta.goal || ""}`,
    `**North Star:** ${meta.northStar || ""}`,
    `**Гипотеза:** ${meta.hypothesis || ""}`,
    `**Не входит в v1:** ${meta.nonGoal || ""}`,
    "",
    "## Карта воронки",
    "",
  ];

  (funnel.stages || []).forEach((stage) => {
    lines.push(`### ${stage.order}. ${stage.title}`, "", stage.description || "", `CTA: ${stage.action || ""}`, `Событие: \`${stage.event || ""}\``, "");
  });

  lines.push("## Источники для парсера", "");
  (funnel.acquisitionSegments || []).forEach((segment) => {
    lines.push(`### ${segment.title}`, "", `Где искать: ${segment.examples || ""}`, `Кого искать: ${segment.targets || ""}`, `Маршрут: ${segment.route || ""}`, `Приоритет: ${segment.priority || ""}`, "");
  });

  lines.push("## Роли", "");
  (funnel.audienceRoles || []).forEach((role) => {
    lines.push(`- **${role.title}:** ${role.signal || ""} → ${role.route || ""}`);
  });

  lines.push("", "## Маршруты", "");
  (funnel.segments || []).forEach((segment) => {
    lines.push(`### ${segment.title}`, "", `Подсегменты: ${segment.subsegments || ""}`, `Задача: ${segment.job || ""}`, `Барьер: ${segment.barrier || ""}`, `Маршрут: ${segment.route || ""}`, `CTA: ${segment.cta || ""}`, "");
  });

  lines.push("## Серия сообщений", "");
  (funnel.sequence || []).forEach((item) => {
    lines.push(`### ${item.day}: ${item.title}`, "", `Цель: ${item.purpose || ""}`, `Hook: ${item.hook || ""}`, item.body || "", `Доказательство: ${item.proof || ""}`, `CTA: ${item.cta || ""}`, "");
  });

  lines.push("## Сборка", "");
  (funnel.assets || []).forEach((item) => {
    lines.push(`- [${item.status === "Готово" ? "x" : " "}] ${item.title} — ${item.owner || "Не назначен"} — ${item.status || "Не начато"}`);
  });

  lines.push("", "## Launch gate", "");
  (funnel.checklist || []).forEach((item) => {
    lines.push(`- [${item.status === "Готово" ? "x" : " "}] ${item.title} — ${item.owner || "Не назначен"} — ${item.status || "Не начато"}`);
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
