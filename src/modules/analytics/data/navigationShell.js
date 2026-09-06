export const DEFAULT_MAIN_TAB = "parser";

export const MAIN_NAV_TABS = [
  { id: "parser", label: "Маркетинг" },
  { id: "analytics", label: "Аналитика" },
  { id: "tasks", label: "Задачи" },
  { id: "content", label: "Контент" },
];

export const MAIN_TAB_BOARD_IDS = {
  session: "sessionQueue",
  tables: "tables",
  parser: "parser",
  marketingOs: "marketingOS",
  analytics: "analytics",
  expenses: "expenses",
  tasks: "launch",
  content: "materials",
  hermes: "hermesAssistant",
  diary: "diary",
  team: "team",
  departments: "departments",
};

export const HEADER_TOOL_ORDER = [
  "marketingOs",
  "session",
  "hermes",
  "expenses",
  "contributions",
  "toolRadar",
  "tables",
  "notes",
  "team",
  "departments",
  "vault",
  "crmListings",
  "crmPartners",
];

export const MARKETING_CONTACTS_TAB = {
  id: "contacts",
  label: "Контакты",
  hint: "единая база",
  boardId: "influencers",
};

export const LEGACY_PRIMARY_TAB_REDIRECTS = {
  dashboard: "parser",
  products: "team",
  productLibrary: "team",
  developments: "team",
};
