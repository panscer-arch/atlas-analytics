import HyipParserPanel from "./HyipParserPanel";
import {
  TELEGRAM_OUTREACH_STORAGE_KEY,
  TELEGRAM_STORAGE_KEY,
  defaultTelegramLeads,
} from "../data/telegramParserData";

const TELEGRAM_SEGMENT_FILTERS = [
  "Web3",
  "DeFi",
  "BNB",
  "Airdrop",
  "IDO",
  "NFT",
  "smart-contract",
  "Blockchain",
  "Trading",
  "News",
  "Education",
  "Metaverse",
  "TON",
  "HYIP",
];

const TELEGRAM_TERM_ALIASES = {
  core: "Web3",
  web3: "Web3",
  defi: "DeFi",
  bnb: "BNB",
  bsc: "BNB",
  airdrop: "Airdrop",
  ido: "IDO",
  launchpad: "IDO",
  nft: "NFT",
  smart: "smart-contract",
  smartcontract: "smart-contract",
  contracts: "smart-contract",
  blockchain: "Blockchain",
  trading: "Trading",
  news: "News",
  education: "Education",
  metaverse: "Metaverse",
  ton: "TON",
  hyip: "HYIP",
};

export default function TelegramChannelsParserPanel() {
  return (
    <HyipParserPanel
      title="Парсер по Telegram-каналам"
      kicker="Telegram parser / outreach"
      seedLeads={defaultTelegramLeads}
      storageKey={TELEGRAM_STORAGE_KEY}
      outreachStorageKey={TELEGRAM_OUTREACH_STORAGE_KEY}
      csvFilename="telegram-web3-channel-leads.csv"
      tableAriaLabel="Список Telegram-каналов для outreach"
      searchPlaceholder="канал, страна, DeFi, NFT, Web3..."
      showVerification
      platformFilterLabel="Сегмент"
      platformAllLabel="Все сегменты"
      keywordFilterOptions={TELEGRAM_SEGMENT_FILTERS}
      keywordAliases={TELEGRAM_TERM_ALIASES}
      manualLeadDefaults={{
        name: "Новый Telegram-канал",
        category: "Telegram / crypto / Web3",
        verificationStatus: "Не проверен",
        verificationNotes: "Проверить TGStat/Telegram, дату последних постов, средние просмотры, ER и публичный контакт админа.",
        notes: "Добавлено вручную: проверить страну, тематику, подписчиков, просмотры, контакты админа и условия рекламы.",
      }}
      draftOptions={{
        intro: "We are preparing an international Web3 campaign and are reviewing Telegram channels focused on crypto, DeFi, NFT, smart contracts, Web3 communities and similar projects.",
        placementLine: "Could you please send your current paid post / webinar / pinned post / channel placement options?",
        trafficLine: "3. Audience geography, average post views, engagement and crypto/Web3 audience quality",
      }}
    />
  );
}
