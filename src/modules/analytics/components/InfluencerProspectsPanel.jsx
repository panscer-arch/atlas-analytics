import HyipParserPanel from "./HyipParserPanel";
import {
  INFLUENCER_OUTREACH_STORAGE_KEY,
  INFLUENCER_STORAGE_KEY,
  defaultInfluencerProspects,
} from "../data/influencerProspectsData";

export default function InfluencerProspectsPanel() {
  return (
    <HyipParserPanel
      title="Инфлюенсеры для Atlas"
      kicker="Influencers / YouTube / Facebook / X / Telegram"
      seedLeads={defaultInfluencerProspects}
      storageKey={INFLUENCER_STORAGE_KEY}
      outreachStorageKey={INFLUENCER_OUTREACH_STORAGE_KEY}
      csvFilename="atlas-influencer-prospects.csv"
      tableAriaLabel="Список инфлюенсеров и сообществ для outreach"
      searchPlaceholder="YouTube, X, Facebook, Telegram, страна, DeFi, airdrop..."
      showVerification
      platformFilterOptions={["YouTube", "X", "Telegram", "Facebook"]}
      platformFilterLabel="Соцсеть"
      manualLeadDefaults={{
        name: "Новый инфлюенсер",
        category: "Influencer / Web3 / crypto",
        verificationStatus: "Не проверен",
        verificationNotes: "Проверить профиль, последние публикации, средние охваты, ER, гео, рекламную историю и контакт для закупки.",
        notes: "Добавлено вручную: проверить platform fit, цену, формат интеграции, токсичность аудитории и compliance-риски.",
      }}
      draftOptions={{
        intro: "We are preparing an international Web3 campaign for Atlas System and are reviewing creators, channels and communities focused on crypto, DeFi, Web3 wallets, airdrops, Telegram communities and similar audiences.",
        placementLine: "Could you please send your current collaboration options for X posts, YouTube integrations, Telegram placements, Facebook community posts, AMA, webinar or short review formats?",
        trafficLine: "3. Audience geography, average views/impressions, engagement rate and crypto/Web3 audience quality",
      }}
    />
  );
}
