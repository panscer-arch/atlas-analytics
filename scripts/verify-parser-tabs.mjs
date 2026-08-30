import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const workspacePath = path.join(root, "src/modules/analytics/components/ParserWorkspacePanel.jsx");
const workspaceSource = fs.readFileSync(workspacePath, "utf8");
const marketingDataPath = path.join(root, "src/modules/analytics/data/marketingDashboardData.js");
const marketingDataSource = fs.readFileSync(marketingDataPath, "utf8");
const {
  MARKETING_DIRECTIONS,
  hydrateMarketingDashboardState,
} = await import(pathToFileURL(marketingDataPath));

const requiredTabs = [
  ["monitors", "Мониторы"],
  ["telegram", "Telegram-каналы"],
  ["youtubeApi", "YouTube API"],
  ["bitnestYoutube", "Битнест YouTube"],
  ["articlePlacement", "SuperSource"],
  ["marketSegments", "Сегменты рынка"],
  ["regionalHiring", "Regional Partners"],
  ["mlmLeaders", "MLM лидеры"],
  ["segmentOutreach", "Сегментный парсер"],
  ["web3Segments", "Web3 сегменты"],
  ["poolMonitor", "Pool Monitor"],
];

const requiredFiles = [
  "src/modules/analytics/components/ArticlePlacementPanel.jsx",
  "src/modules/analytics/components/BitnestYoutubeParserPanel.jsx",
  "src/modules/analytics/components/InfluencerProspectsPanel.jsx",
  "src/modules/analytics/components/MarketSegmentsPanel.jsx",
  "src/modules/analytics/components/MlmLeaderOutreachPanel.jsx",
  "src/modules/analytics/components/PoolMonitorPanel.jsx",
  "src/modules/analytics/components/RegionalHiringPanel.jsx",
  "src/modules/analytics/components/SegmentOutreachPanel.jsx",
  "src/modules/analytics/components/TelegramChannelsParserPanel.jsx",
  "src/modules/analytics/components/Web3SegmentsPanel.jsx",
  "src/modules/analytics/components/YouTubeApiSearchPanel.jsx",
  "src/modules/analytics/data/articlePlacementData.js",
  "src/modules/analytics/data/bitnestYoutubeParserData.js",
  "src/modules/analytics/data/marketSegmentsData.js",
  "src/modules/analytics/data/mlmLeaderOutreachData.js",
  "src/modules/analytics/data/platformSourceSeeds.js",
  "src/modules/analytics/data/regionalHiringData.js",
  "src/modules/analytics/data/segmentOutreachData.js",
  "src/modules/analytics/data/web3SegmentsData.js",
  "src/modules/analytics/data/youtubeChannelSeeds.js",
];

const missingTabs = requiredTabs.filter(([id, label]) => (
  !workspaceSource.includes(`id: "${id}"`) || !workspaceSource.includes(`label: "${label}"`)
));
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
const requiredMarketingDirections = [
  ["mlm", "Знакомые сетевики"],
  ["mlmIntroductions", "Знакомство с сетевиками"],
  ["events", "Блокчейн-фесты и MLM-мероприятия"],
  ["vacancies", "Работа с базой вакансий"],
];
const missingMarketingDirections = requiredMarketingDirections.filter(([id, title]) => (
  !marketingDataSource.includes(`id: "${id}"`) || !marketingDataSource.includes(`title: "${title}"`)
));
const removedMarketingDirectionStillPresent = (
  marketingDataSource.includes('id: "creatives"')
  || marketingDataSource.includes('title: "Креативы и SEO"')
);
const missingLegacyCreativeRoute = !workspaceSource.includes('"marketing-creatives": "atlasCreatives"');
const migratedDashboard = hydrateMarketingDashboardState({
  directions: {
    creatives: {
      owner: "Архивный владелец",
      notes: "Не удалять",
      rows: [{ id: "legacy-creative-row" }],
      materials: [{ id: "legacy-creative-material" }],
    },
  },
});
const legacyCreativeStateLost = (
  migratedDashboard.directions.creatives
  || migratedDashboard.archivedDirections?.creatives?.notes !== "Не удалять"
);
const migratedTelegaDashboard = hydrateMarketingDashboardState({
  directions: {
    complex: {
      owner: "Генри",
      notes: "План Генри",
      rows: [{ id: "complex-row", name: "Медиапартнёр" }],
      materials: [{ id: "complex-material", title: "Медиаплан" }],
    },
    telega: {
      owner: "Архивный владелец",
      notes: "Старые заметки Telega",
      rows: [{ id: "telega-row", name: "Telegram-канал" }],
      materials: [{ id: "telega-material", title: "Старый медиакит" }],
    },
  },
});
const activeDirectionIds = new Set(MARKETING_DIRECTIONS.map((direction) => direction.id));
const telegaMigrationFailed = (
  activeDirectionIds.has("telega")
  || migratedTelegaDashboard.directions.telega
  || migratedTelegaDashboard.archivedDirections?.telega?.notes !== "Старые заметки Telega"
  || !migratedTelegaDashboard.directions.complex.rows.some((row) => row.id === "complex-row")
  || !migratedTelegaDashboard.directions.complex.rows.some((row) => row.id === "telega-row")
  || !migratedTelegaDashboard.directions.complex.materials.some((material) => material.id === "complex-material")
  || !migratedTelegaDashboard.directions.complex.materials.some((material) => material.id === "telega-material")
  || !migratedTelegaDashboard.directions.complex.notes.includes("План Генри")
  || !migratedTelegaDashboard.directions.complex.notes.includes("Старые заметки Telega")
);
const marketingStructureFailed = (
  MARKETING_DIRECTIONS.find((direction) => direction.id === "mlm")?.sourceKey !== "generic"
  || MARKETING_DIRECTIONS.find((direction) => direction.id === "mlmIntroductions")?.sourceKey !== "mlm"
  || MARKETING_DIRECTIONS.find((direction) => direction.id === "email")?.title !== "Email-маркетинг (спам-маркетинг)"
);
const rehydratedTelegaDashboard = hydrateMarketingDashboardState(migratedTelegaDashboard);
const telegaNotesNotIdempotent = (
  rehydratedTelegaDashboard.directions.complex.notes !== migratedTelegaDashboard.directions.complex.notes
);

if (missingTabs.length || missingFiles.length || missingMarketingDirections.length || removedMarketingDirectionStillPresent || missingLegacyCreativeRoute || legacyCreativeStateLost || telegaMigrationFailed || marketingStructureFailed || telegaNotesNotIdempotent) {
  console.error("Parser tabs verification failed.");
  if (missingTabs.length) {
    console.error("Missing tabs:");
    missingTabs.forEach(([id, label]) => console.error(`- ${id}: ${label}`));
  }
  if (missingFiles.length) {
    console.error("Missing files:");
    missingFiles.forEach((file) => console.error(`- ${file}`));
  }
  if (missingMarketingDirections.length) {
    console.error("Missing marketing directions:");
    missingMarketingDirections.forEach(([id, title]) => console.error(`- ${id}: ${title}`));
  }
  if (removedMarketingDirectionStillPresent) {
    console.error('Removed marketing direction "Креативы и SEO" is still present.');
  }
  if (missingLegacyCreativeRoute) {
    console.error("The legacy marketing-creatives URL must redirect to atlasCreatives.");
  }
  if (legacyCreativeStateLost) {
    console.error("The retired creatives direction must be archived without remaining active.");
  }
  if (telegaMigrationFailed) {
    console.error("The retired Telega direction must be archived and merged into complex promotion without losing data.");
  }
  if (marketingStructureFailed) {
    console.error("The marketing direction split or email title is incorrect.");
  }
  if (telegaNotesNotIdempotent) {
    console.error("Repeated dashboard hydration must not duplicate Telega migration notes.");
  }
  process.exit(1);
}

console.log(`Parser tabs verified: ${requiredTabs.length} tabs, ${requiredFiles.length} files and ${requiredMarketingDirections.length} replacement marketing directions.`);
