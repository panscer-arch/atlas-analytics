const DIRECTION_TITLES = {
  mlm: "MLM-лидеры",
  influencers: "Инфлюенсеры",
  monitors: "HYIP-мониторы",
  complex: "Комплексное продвижение",
  telega: "Telegram-реклама",
  articles: "Статьи и PR",
  guerrilla: "Партизанский маркетинг",
  email: "Email-маркетинг",
  web3Ads: "Web3-реклама",
  revshare: "RevShare",
  listings: "dApp-листинги",
  events: "Блокчейн-фесты и MLM-мероприятия",
  vacancies: "База вакансий",
};

const TERMINAL_STATUSES = new Set(["Подключено", "Размещено", "Опубликовано", "Завершено", "Отказ"]);
const PLACEHOLDER_NAMES = new Set(["", "Новый контакт / площадка", "Новый материал"]);

function stringValue(value = "") {
  return String(value || "").trim();
}

function clippedValue(value = "", maxLength = 500) {
  const text = stringValue(value);
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function directionTitle(directionId) {
  return DIRECTION_TITLES[directionId] || directionId || "Маркетинг";
}

function activeById(items = []) {
  return new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item && !item.deleted && item.id)
      .map((item) => [String(item.id), item]),
  );
}

function eventId(parts) {
  return parts.map((part) => stringValue(part).replaceAll("|", "/")).join("|");
}

function createEvent(type, directionId, entityId, text, occurredAt, priority = "normal") {
  const safeText = clippedValue(text, 500);
  return {
    id: eventId([type, directionId, clippedValue(entityId, 160), safeText]),
    type,
    directionId,
    entityId: clippedValue(entityId, 160),
    text: safeText,
    priority,
    occurredAt,
  };
}

export function collectMarketingDashboardEvents(previousDashboard, currentDashboard, occurredAt = new Date().toISOString()) {
  if (!previousDashboard?.directions || !currentDashboard?.directions) return [];

  const events = [];
  const directionIds = new Set([
    ...Object.keys(previousDashboard.directions),
    ...Object.keys(currentDashboard.directions),
  ]);

  for (const directionId of directionIds) {
    const before = previousDashboard.directions[directionId] || {};
    const after = currentDashboard.directions[directionId] || {};
    const label = directionTitle(directionId);

    const beforeOwner = stringValue(before.owner);
    const afterOwner = stringValue(after.owner);
    if (afterOwner && afterOwner !== beforeOwner && afterOwner !== "Назначить") {
      events.push(createEvent(
        "owner",
        directionId,
        directionId,
        `${label}: ответственный — ${afterOwner}`,
        occurredAt,
      ));
    }

    const beforePhase = stringValue(before.phase);
    const afterPhase = stringValue(after.phase);
    if (beforePhase && afterPhase && beforePhase !== afterPhase) {
      events.push(createEvent(
        "phase",
        directionId,
        directionId,
        `${label}: этап ${beforePhase} → ${afterPhase}`,
        occurredAt,
        afterPhase === "На паузе" ? "attention" : "normal",
      ));
    }

    const beforeRows = activeById(before.rows);
    const afterRows = activeById(after.rows);
    for (const [rowId, row] of afterRows) {
      const previousRow = beforeRows.get(rowId);
      const rowName = stringValue(row.name);
      if (!previousRow) {
        if (!PLACEHOLDER_NAMES.has(rowName)) {
          events.push(createEvent(
            "row-added",
            directionId,
            rowId,
            `${label}: добавлен ${rowName}`,
            occurredAt,
          ));
        }
        continue;
      }

      const beforeStatus = stringValue(previousRow.status);
      const afterStatus = stringValue(row.status);
      const beforeName = stringValue(previousRow.name);
      if (PLACEHOLDER_NAMES.has(beforeName) && !PLACEHOLDER_NAMES.has(rowName)) {
        events.push(createEvent(
          "row-added",
          directionId,
          rowId,
          `${label}: добавлен ${rowName}`,
          occurredAt,
        ));
      }
      if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
        events.push(createEvent(
          "row-status",
          directionId,
          rowId,
          `${label}: ${rowName || "запись"} — ${beforeStatus} → ${afterStatus}`,
          occurredAt,
          TERMINAL_STATUSES.has(afterStatus) ? "result" : "normal",
        ));
      }

      const beforeDue = stringValue(previousRow.nextActionDueAt);
      const afterDue = stringValue(row.nextActionDueAt);
      if (afterDue && afterDue !== beforeDue) {
        events.push(createEvent(
          "deadline",
          directionId,
          rowId,
          `${label}: ${rowName || "запись"} — следующий шаг до ${afterDue}`,
          occurredAt,
        ));
      }
    }

    const beforeMaterials = activeById(before.materials);
    const afterMaterials = activeById(after.materials);
    for (const [materialId, material] of afterMaterials) {
      const previousMaterial = beforeMaterials.get(materialId);
      const title = stringValue(material.title);
      if (!previousMaterial) {
        if (!PLACEHOLDER_NAMES.has(title)) {
          events.push(createEvent(
            "material-added",
            directionId,
            materialId,
            `${label}: добавлен материал «${title}»`,
            occurredAt,
          ));
        }
        continue;
      }

      const beforeUrl = stringValue(previousMaterial.url);
      const afterUrl = stringValue(material.url);
      const beforeTitle = stringValue(previousMaterial.title);
      if (PLACEHOLDER_NAMES.has(beforeTitle) && !PLACEHOLDER_NAMES.has(title)) {
        events.push(createEvent(
          "material-added",
          directionId,
          materialId,
          `${label}: добавлен материал «${title}»`,
          occurredAt,
        ));
      }
      if (!beforeUrl && afterUrl) {
        events.push(createEvent(
          "material-link",
          directionId,
          materialId,
          `${label}: у материала «${title || "без названия"}» появилась ссылка`,
          occurredAt,
          "result",
        ));
      }

      const beforeStatus = stringValue(previousMaterial.status);
      const afterStatus = stringValue(material.status);
      if (beforeStatus && afterStatus && beforeStatus !== afterStatus && /готов|опублик|размещ|approved|published/i.test(afterStatus)) {
        events.push(createEvent(
          "material-status",
          directionId,
          materialId,
          `${label}: «${title || "материал"}» — ${afterStatus}`,
          occurredAt,
          "result",
        ));
      }
    }
  }

  return events;
}

export function collectMarketingSourceEvents(previousSources, currentSources, occurredAt = new Date().toISOString()) {
  if (!previousSources || !currentSources) return [];

  const events = [];
  for (const [sourceId, source] of Object.entries(currentSources)) {
    const previousSource = previousSources[sourceId];
    if (!previousSource) continue;

    const beforeRecords = previousSource.records || {};
    const afterRecords = source.records || {};
    const label = stringValue(source.label) || directionTitle(source.directionId);
    const addedRecordIds = Object.keys(afterRecords).filter((recordId) => !beforeRecords[recordId]);
    const isBulkImport = addedRecordIds.length > 10;
    if (isBulkImport) {
      events.push(createEvent(
        "source-bulk-added",
        source.directionId || sourceId,
        sourceId,
        `${label}: добавлено ${addedRecordIds.length} записей`,
        occurredAt,
      ));
    }
    for (const [recordId, record] of Object.entries(afterRecords)) {
      const previousRecord = beforeRecords[recordId];
      const name = stringValue(record.name) || "запись";
      if (!previousRecord) {
        if (!isBulkImport && !PLACEHOLDER_NAMES.has(name) && !/^нов(ая|ый)/i.test(name)) {
          events.push(createEvent(
            "source-added",
            source.directionId || sourceId,
            recordId,
            `${label}: добавлен ${name}`,
            occurredAt,
          ));
        }
        continue;
      }

      const beforeStatus = stringValue(previousRecord.status);
      const afterStatus = stringValue(record.status);
      if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
        events.push(createEvent(
          "source-status",
          source.directionId || sourceId,
          recordId,
          `${label}: ${name} — ${beforeStatus} → ${afterStatus}`,
          occurredAt,
          TERMINAL_STATUSES.has(afterStatus) || /договор|ответ|цена|опублик|размещ|подключ|заверш/i.test(afterStatus)
            ? "result"
            : "normal",
        ));
      }
    }
  }

  return events;
}

export function collectMarketingDueEvents(dashboard, dateKey, alreadyReminded = {}) {
  if (!dashboard?.directions || !dateKey) return { events: [], reminded: { ...alreadyReminded } };

  const events = [];
  const reminded = { ...alreadyReminded };
  for (const [directionId, direction] of Object.entries(dashboard.directions)) {
    for (const row of Array.isArray(direction?.rows) ? direction.rows : []) {
      if (!row || row.deleted || !row.id || TERMINAL_STATUSES.has(stringValue(row.status))) continue;
      const dueAt = stringValue(row.nextActionDueAt);
      if (!dueAt || dueAt > dateKey) continue;

      const reminderKey = `${directionId}:${row.id}`;
      if (reminded[reminderKey] === dateKey) continue;
      const overdue = dueAt < dateKey;
      const rowName = stringValue(row.name) || "запись";
      events.push(createEvent(
        overdue ? "overdue" : "due-today",
        directionId,
        row.id,
        `${directionTitle(directionId)}: ${rowName} — ${overdue ? `просрочено с ${dueAt}` : "срок сегодня"}`,
        new Date().toISOString(),
        "attention",
      ));
      reminded[reminderKey] = dateKey;
    }
  }

  return { events, reminded };
}

export function mergeMarketingEvents(existing = [], added = [], limit = 100) {
  const byId = new Map();
  for (const event of [...existing, ...added]) {
    if (!event?.id) continue;
    byId.set(event.id, event);
  }
  return [...byId.values()].slice(-limit);
}

function escapeTelegramHtml(value = "") {
  return stringValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatMarketingDashboardDigest(events = [], boardUrl = "https://supersussystem.com/?board=parser") {
  const ordered = [...events].sort((left, right) => {
    const score = { result: 0, attention: 1, normal: 2 };
    return (score[left.priority] ?? 2) - (score[right.priority] ?? 2);
  });
  const footer = `<a href="${boardUrl}">Открыть Marketing Dashboard</a>`;
  const lines = [
    "<b>Маркетинг: что изменилось</b>",
    "",
  ];
  let visibleCount = 0;
  for (const event of ordered.slice(0, 15)) {
    const line = `• ${escapeTelegramHtml(clippedValue(event.text, 260))}`;
    if ([...lines, line, "", footer].join("\n").length > 3700) break;
    lines.push(line);
    visibleCount += 1;
  }
  const hiddenCount = Math.max(0, ordered.length - visibleCount);
  if (hiddenCount) lines.push(`• Ещё изменений: ${hiddenCount}`);
  lines.push("", footer);
  return lines.filter((line, index) => line || index === 1 || index === lines.length - 2).join("\n");
}
