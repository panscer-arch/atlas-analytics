import {
  collectMarketingDashboardEvents,
  collectMarketingDueEvents,
  collectMarketingSourceEvents,
  formatMarketingDashboardDigest,
  mergeMarketingEvents,
} from "../server/marketing-dashboard-monitor.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function dashboard(direction) {
  return {
    directions: {
      email: {
        owner: "Назначить",
        phase: "Сбор базы",
        notes: "",
        rows: [],
        materials: [],
        ...direction,
      },
    },
  };
}

const baseline = dashboard({
  rows: [{
    id: "lead-1",
    name: "NinjaPromo",
    status: "Кандидат",
    nextActionDueAt: "",
    note: "",
  }],
});
assert(
  collectMarketingDashboardEvents(null, baseline).length === 0,
  "The first monitor run must create a baseline without sending old data",
);

const changed = dashboard({
  owner: "Костя",
  notes: "This note edit must stay quiet",
  rows: [
    {
      id: "lead-1",
      name: "NinjaPromo",
      status: "Переговоры",
      nextActionDueAt: "2026-07-20",
      note: "Edited note",
    },
    {
      id: "lead-2",
      name: "Coinbound",
      status: "Кандидат",
      nextActionDueAt: "",
      note: "",
    },
  ],
  materials: [{
    id: "material-1",
    title: "Email brief",
    url: "https://example.com/brief",
    status: "Готово",
  }],
});
const events = collectMarketingDashboardEvents(baseline, changed, "2026-07-19T12:00:00.000Z");
assert(events.some((event) => event.type === "owner"), "Owner assignment must be reported");
assert(events.some((event) => event.type === "row-status"), "Pipeline status change must be reported");
assert(events.some((event) => event.type === "deadline"), "New deadline must be reported");
assert(events.some((event) => event.type === "row-added"), "New lead must be reported");
assert(events.some((event) => event.type === "material-added"), "New material must be reported");
assert(!events.some((event) => event.type === "notes"), "Free-form note edits must stay quiet");

const placeholderEvents = collectMarketingDashboardEvents(
  dashboard({
    rows: [{ id: "new-row", name: "Новый контакт / площадка", status: "Кандидат" }],
    materials: [{ id: "new-material", title: "Новый материал", status: "Черновик", url: "" }],
  }),
  dashboard({
    rows: [{ id: "new-row", name: "Coinbound", status: "Кандидат" }],
    materials: [{ id: "new-material", title: "Atlas media kit", status: "Черновик", url: "" }],
  }),
);
assert(placeholderEvents.some((event) => event.type === "row-added"), "Finalized placeholder lead must be reported");
assert(placeholderEvents.some((event) => event.type === "material-added"), "Finalized placeholder material must be reported");

const due = collectMarketingDueEvents(changed, "2026-07-21", {});
assert(due.events.some((event) => event.type === "overdue"), "Overdue next actions must be reported");
const repeatedDue = collectMarketingDueEvents(changed, "2026-07-21", due.reminded);
assert(repeatedDue.events.length === 0, "The same overdue item must not repeat during the day");

const merged = mergeMarketingEvents(events, events);
assert(merged.length === events.length, "Queued events must be deduplicated");

const sourceEvents = collectMarketingSourceEvents(
  {
    influencers: {
      directionId: "influencers",
      label: "Инфлюенсеры",
      records: {
        "youtube-1": { name: "Manny Media", status: "Написали" },
      },
    },
  },
  {
    influencers: {
      directionId: "influencers",
      label: "Инфлюенсеры",
      records: {
        "youtube-1": { name: "Manny Media", status: "Ответили" },
        "youtube-2": { name: "Web3 Daily", status: "Кандидат" },
      },
    },
  },
);
assert(sourceEvents.some((event) => event.type === "source-status"), "Linked parser status changes must be reported");
assert(sourceEvents.some((event) => event.type === "source-added"), "Linked parser additions must be reported");
const bulkSourceEvents = collectMarketingSourceEvents(
  { imported: { directionId: "mlm", label: "MLM-лидеры", records: {} } },
  {
    imported: {
      directionId: "mlm",
      label: "MLM-лидеры",
      records: Object.fromEntries(Array.from({ length: 25 }, (_, index) => [
        `lead-${index}`,
        { name: `Lead ${index}`, status: "Новый" },
      ])),
    },
  },
);
assert(
  bulkSourceEvents.length === 1 && bulkSourceEvents[0].type === "source-bulk-added",
  "A legitimate bulk import must produce one aggregated event",
);

const digest = formatMarketingDashboardDigest(events);
assert(digest.includes("Маркетинг: что изменилось"), "Digest heading is missing");
assert(digest.includes("Открыть Marketing Dashboard"), "Dashboard link is missing");
assert(!digest.includes("This note edit"), "Notes leaked into the digest");
const oversizedDigest = formatMarketingDashboardDigest(Array.from({ length: 30 }, (_, index) => ({
  id: `large-${index}`,
  priority: "normal",
  text: `${index}: ${"очень длинное название ".repeat(300)}`,
})));
assert(oversizedDigest.length < 4096, "Telegram digest must stay below the platform message limit");

console.log("Marketing Dashboard monitor verified: baseline, useful diffs, daily reminders, deduplication and digest formatting are correct.");
