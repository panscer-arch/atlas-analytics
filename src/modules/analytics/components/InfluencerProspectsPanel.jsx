import HyipParserPanel from "./HyipParserPanel";
import {
  INFLUENCER_OUTREACH_STORAGE_KEY,
  INFLUENCER_STORAGE_KEY,
  defaultInfluencerProspects,
} from "../data/influencerProspectsData";

export default function InfluencerProspectsPanel() {
  return (
    <HyipParserPanel
      title="Контакты"
      kicker="Contacts / Email / Telegram / WhatsApp / Social"
      seedLeads={defaultInfluencerProspects}
      storageKey={INFLUENCER_STORAGE_KEY}
      outreachStorageKey={INFLUENCER_OUTREACH_STORAGE_KEY}
      csvFilename="atlas-contacts.csv"
      tableAriaLabel="Список контактов, каналов связи и истории outreach"
      searchPlaceholder="Имя, email, Telegram, WhatsApp, соцсеть, страна..."
      showVerification
      platformFilterOptions={["YouTube", "X", "Telegram", "Facebook", "TikTok", "Instagram", "Reddit", "Google"]}
      keywordFilterOptions={["Bitnest"]}
      platformFilterLabel="Соцсеть"
      manualLeadDefaults={{
        name: "Новый контакт",
        category: "Контакт / партнёр / автор",
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
