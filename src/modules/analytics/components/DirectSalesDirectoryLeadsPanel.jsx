import BusinessForHomeLeadsPanel from "./BusinessForHomeLeadsPanel";
import {
  DIRECT_SALES_DIRECTORY_LEAD_STATUS_OPTIONS,
  DIRECT_SALES_DIRECTORY_LEADS_STORAGE_KEY,
  defaultDirectSalesDirectoryLeads,
} from "../data/directSalesDirectoryLeadsData";

const directory = {
  storageKey: DIRECT_SALES_DIRECTORY_LEADS_STORAGE_KEY,
  statusOptions: DIRECT_SALES_DIRECTORY_LEAD_STATUS_OPTIONS,
  defaultLeads: defaultDirectSalesDirectoryLeads,
  sourceName: "Direct Sales Directory",
  sourceDescription: "Открытые карточки представителей из США и Канады. Email указан только там, где владелец профиля опубликовал его сам.",
  profileLabel: "Карточка DSD",
  csvFileName: "atlas-direct-sales-directory-leads.csv",
  sourceUrl: "https://www.directsalesdirectory.com/find-a-rep/",
  lastVerifiedAt: "2026-07-11",
};

export default function DirectSalesDirectoryLeadsPanel() {
  return <BusinessForHomeLeadsPanel directory={directory} />;
}
