import HyipParserPanel from "./HyipParserPanel";
import {
  TELEGRAM_OUTREACH_STORAGE_KEY,
  TELEGRAM_STORAGE_KEY,
  defaultTelegramLeads,
} from "../data/telegramParserData";

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
      manualLeadDefaults={{
        name: "Новый Telegram-канал",
        category: "Telegram / crypto / Web3",
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
