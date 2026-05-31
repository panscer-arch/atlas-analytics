import PresentationContentTab from "./PresentationContentTab";
import RestoredGeographyTab from "./RestoredGeographyTab";
import RestoredOverviewTab from "./RestoredOverviewTab";
import RestoredPartnerTab from "./RestoredPartnerTab";
import RestoredProductsTab from "./RestoredProductsTab";
import RestoredTrafficTab from "./RestoredTrafficTab";
import RestoredWalletsTab from "./RestoredWalletsTab";

export default function RestoredActiveTab({
  activeTab,
  data,
  geographyRows,
  groupedProductRows,
  partnerRows,
  trafficCountryRows,
  walletRows,
}) {
  if (activeTab === "traffic") return <RestoredTrafficTab rows={trafficCountryRows} />;
  if (activeTab === "products") return <RestoredProductsTab groupedRows={groupedProductRows} />;
  if (activeTab === "presentation") return <PresentationContentTab />;
  if (activeTab === "wallets") return <RestoredWalletsTab walletRows={walletRows} partnerRows={partnerRows} />;
  if (activeTab === "partner") return <RestoredPartnerTab rows={partnerRows} />;
  if (activeTab === "geography") return <RestoredGeographyTab rows={geographyRows} />;
  return <RestoredOverviewTab data={data} />;
}
