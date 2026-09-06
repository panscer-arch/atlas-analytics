import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const headerSource = read("src/modules/analytics/components/AnalyticsHeader.jsx");
const pageSource = read("src/modules/analytics/AnalyticsPage.jsx");
const panelSource = read("src/modules/analytics/components/AnalyticsMainPanel.jsx");
const registrySource = read("src/modules/analytics/components/LaunchBoardRegistry.jsx");
const parserSource = read("src/modules/analytics/components/ParserWorkspacePanel.jsx");
const contactsSource = read("src/modules/analytics/components/InfluencerProspectsPanel.jsx");
const contactsDataSource = read("src/modules/analytics/data/influencerProspectsData.js");

const checks = [
  [!headerSource.includes("onContactsOpen") && !headerSource.includes('label="Контакты"'), "Кнопка «Контакты» всё ещё находится в шапке."],
  [!pageSource.includes('contacts: "influencers"') && !pageSource.includes('handleMainTabChange("contacts")'), "Контакты всё ещё подключены как самостоятельный основной раздел."],
  [!panelSource.includes('activeTab === "contacts"'), "Контакты всё ещё открываются отдельной основной панелью."],
  [registrySource.includes('if (boardId === "influencers" || boardId === "marketing-influencers") return "parser";'), "Старые URL контактов не ведут внутрь маркетинга."],
  [registrySource.includes('influencers: () => <InfluencerProspectsPanel />'), "Статическая доска инфлюенсеров не открывает контакты напрямую."],
  [parserSource.includes("MARKETING_CONTACTS_TAB"), "Во внутренних вкладках маркетинга нет «Контактов»."],
  [parserSource.includes("contacts: MARKETING_CONTACTS_TAB.boardId") && parserSource.includes('activeTab === "contacts"'), "Вкладка «Контакты» не открывает существующую базу."],
  [parserSource.includes('"marketing-influencers": "influencers"'), "Старая ссылка marketing-influencers не перенаправляется во внутренние «Контакты»."],
  [parserSource.includes("VISIBLE_MARKETING_DIRECTIONS"), "Карточка инфлюенсеров всё ещё видна в маркетинговом центре."],
  [contactsSource.includes('title="Контакты"') && contactsSource.includes('csvFilename="atlas-contacts.csv"'), "Экран контактов не переименован."],
  [contactsSource.includes("WhatsApp") && contactsSource.includes('name: "Новый контакт"'), "Поиск или ручное добавление контакта не обновлены."],
  [contactsSource.includes("INFLUENCER_STORAGE_KEY") && contactsSource.includes("INFLUENCER_OUTREACH_STORAGE_KEY"), "Существующие ключи хранения контактов не сохранены."],
  [contactsDataSource.includes("INFLUENCER_STORAGE_KEY") && contactsDataSource.includes("INFLUENCER_OUTREACH_STORAGE_KEY"), "Ключи серверной синхронизации контактов отсутствуют."],
];

const failed = checks.filter(([ok]) => !ok).map(([, message]) => message);

if (failed.length) {
  console.error("Contacts navigation verification failed:");
  failed.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("Contacts navigation verified: nested Marketing tab, legacy URLs and storage compatibility.");
