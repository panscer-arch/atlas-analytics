import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/modules/analytics/components/ParserWorkspacePanel.jsx");
const workspaceSource = fs.readFileSync(workspacePath, "utf8");

const requiredTabs = [
  ["monitors", "Мониторы"],
  ["telegram", "Telegram-каналы"],
  ["influencers", "Инфлюенсеры"],
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

if (missingTabs.length || missingFiles.length) {
  console.error("Parser tabs verification failed.");
  if (missingTabs.length) {
    console.error("Missing tabs:");
    missingTabs.forEach(([id, label]) => console.error(`- ${id}: ${label}`));
  }
  if (missingFiles.length) {
    console.error("Missing files:");
    missingFiles.forEach((file) => console.error(`- ${file}`));
  }
  process.exit(1);
}

console.log(`Parser tabs verified: ${requiredTabs.length} tabs and ${requiredFiles.length} files.`);
