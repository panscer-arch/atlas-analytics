import AnalyticsBoardEmbed from "./AnalyticsBoardEmbed";
import AtlasPresentationBoard from "./AtlasPresentationBoard";
import CodexSystemBoard from "./CodexSystemBoard";
import ContentPlanBoard from "./ContentPlanBoard";
import DailyTasksBoard from "./DailyTasksBoard";
import AgentFaqTemplate from "./AgentFaqTemplate";
import AgentKnowledgeTemplate from "./AgentKnowledgeTemplate";
import AgentTerminologyTemplate from "./AgentTerminologyTemplate";
import AgentTrainingDataset from "./AgentTrainingDataset";
import DevelopmentsRegistry from "./DevelopmentsRegistry";
import ImageContentBoard from "./ImageContentBoard";
import InfluencerProspectsPanel from "./InfluencerProspectsPanel";
import LegalDocumentsBoard from "./LegalDocumentsBoard";
import LocalizationBibleBoard from "./LocalizationBibleBoard";
import MaterialsLinksBoard from "./MaterialsLinksBoard";
import ParserWorkspacePanel from "./ParserWorkspacePanel";
import PresentationContentTab from "./PresentationContentTab";
import ProductLibraryBoard from "./ProductLibraryBoard";
import SecurityReviewBoard from "./SecurityReviewBoard";
import SocialSubscriptionsBoard from "./SocialSubscriptionsBoard";
import VideoScriptsBoard from "./VideoScriptsBoard";
import WhitePaperBoard from "./WhitePaperBoard";
import Wrapper from "./Wrapper";

const TASK_CATEGORY_STORAGE_PREFIX = "atlas.analytics.taskCategoryChecklist";

export const TASK_CATEGORY_BOARDS = [
  {
    id: "inboxTasks",
    label: "Входящие",
    title: "Входящие задачи",
    storageKey: `${TASK_CATEGORY_STORAGE_PREFIX}.inbox.v1`,
    defaultResponsible: "Входящие / разбор",
    description: "Сюда складываем сырые задачи, если пока непонятно, к какому направлению их отнести.",
    emptyHint: "Сюда можно быстро закидывать всё неразобранное, а потом переносить формулировки в нужные направления.",
  },
  {
    id: "smmTasks",
    label: "SMM",
    title: "Задачи по SMM",
    storageKey: `${TASK_CATEGORY_STORAGE_PREFIX}.smm.v1`,
    defaultResponsible: "SMM / соцсети",
    description: "Соцсети, прогрев, публикации, аккаунты, комментарии, визуалы и работа с аудиторией.",
    emptyHint: "Добавляй задачи по X, Instagram, Telegram, прогреву каналов и регулярному постингу.",
  },
  {
    id: "siteTasks",
    label: "Сайт",
    title: "Задачи по сайту",
    storageKey: `${TASK_CATEGORY_STORAGE_PREFIX}.site.v1`,
    defaultResponsible: "Сайт / frontend",
    description: "Личный кабинет, лендинги, публичные страницы, формы, адаптив и пользовательские сценарии.",
    emptyHint: "Сюда удобно добавлять задачи по кабинету, лендингам, вебинарам, формам и страницам.",
  },
  {
    id: "contentTasks",
    label: "Контент",
    title: "Задачи по контенту",
    storageKey: `${TASK_CATEGORY_STORAGE_PREFIX}.content.v1`,
    defaultResponsible: "Контент / редактура",
    description: "Тексты, ролики, презентации, FAQ, сценарии, посты, переводы и смысловая упаковка.",
    emptyHint: "Сюда идут задачи по текстам, видео, презентациям, FAQ, переводам и редактуре.",
  },
  {
    id: "designTasks",
    label: "Дизайн",
    title: "Задачи по дизайну",
    storageKey: `${TASK_CATEGORY_STORAGE_PREFIX}.design.v1`,
    defaultResponsible: "Дизайн / UI",
    description: "UI, брендбук, обложки, презентации, иконки, визуальные материалы и согласование макетов.",
    emptyHint: "Добавляй сюда задачи по UI, брендбуку, презентациям, обложкам и визуальным материалам.",
  },
  {
    id: "legalTasks",
    label: "Legal",
    title: "Юридические задачи",
    storageKey: `${TASK_CATEGORY_STORAGE_PREFIX}.legal.v1`,
    defaultResponsible: "Legal / документы",
    description: "Документы, политики, правила, риски, дисклеймеры, compliance-формулировки и юридическая вычитка.",
    emptyHint: "Сюда складываем документы, юридические формулировки, риски и вопросы compliance.",
  },
  {
    id: "techTasks",
    label: "Tech",
    title: "Технические задачи",
    storageKey: `${TASK_CATEGORY_STORAGE_PREFIX}.tech.v1`,
    defaultResponsible: "Tech / разработка",
    description: "Frontend, backend, smart-contract, деплой, интеграции, боты, инфраструктура, баги и QA.",
    emptyHint: "Сюда идут задачи по разработке, smart-contract, серверу, боту, API, деплою и проверкам.",
  },
];

export const TASK_BOARD_TABS = [
  { id: "inboxTasks", label: "Входящие" },
  { id: "launch", label: "Задачи запуска" },
  { id: "marketing", label: "Маркетинг" },
  { id: "knowledgeBase", label: "Задачи по базе знаний" },
  { id: "ideas", label: "Идеи" },
  { id: "dailyTasks", label: "Ближайшие задачи" },
  { id: "socialSubscriptions", label: "Подписки" },
  { id: "productLibrary", label: "Библиотека" },
  { id: "developments", label: "Разработки" },
  { id: "crmBoard", label: "CRM-доска" },
];

export const CONTENT_BOARD_TABS = [
  { id: "contentPlan", label: "Контент-план" },
  { id: "images", label: "Images" },
  { id: "materials", label: "Материалы" },
  { id: "presentation", label: "Презентация" },
  { id: "agentTasks", label: "Параметры" },
  { id: "agentDataset", label: "Датасет" },
  { id: "agentFaq", label: "FAQ" },
  { id: "ceoPresentation", label: "CEO-презентация" },
  { id: "whitePaper", label: "White Paper" },
  { id: "atlasInstructions", label: "Инструкции" },
  { id: "legalDocs", label: "Документы" },
  { id: "videoScripts", label: "Ролики" },
  { id: "terminology", label: "Терминология" },
  { id: "localization", label: "Локализация" },
  { id: "securityReview", label: "Security Review" },
  { id: "codexSystem", label: "Codex OS" },
];

export const STATIC_CONTENT_BOARD_IDS = [
  "dailyTasks",
  "contentPlan",
  "images",
  "videoScripts",
  "materials",
  "presentation",
  "productLibrary",
  "socialSubscriptions",
  "developments",
  "crmBoard",
  "parser",
  "telegramParser",
  "influencers",
  "agentTasks",
  "agentDataset",
  "agentFaq",
  "ceoPresentation",
  "whitePaper",
  "atlasInstructions",
  "legalDocs",
  "terminology",
  "localization",
  "securityReview",
  "codexSystem",
];

export const CONTENT_BOARD_IDS = [
  ...CONTENT_BOARD_TABS.map((tab) => tab.id),
];

export const TASK_BOARD_IDS = [
  ...TASK_BOARD_TABS.map((tab) => tab.id),
  ...TASK_CATEGORY_BOARDS.map((board) => board.id),
];

export function getAnalyticsTabForBoard(boardId) {
  if (!boardId) return "dashboard";
  if (boardId === "expenses") return "analytics";
  if (boardId === "parser" || boardId === "telegramParser" || boardId === "influencers") return "parser";
  if (boardId === "diary") return "diary";
  if (boardId === "transportRiskFaq") return "content";
  if (CONTENT_BOARD_IDS.includes(boardId)) return "content";
  if (TASK_BOARD_IDS.includes(boardId)) return "tasks";
  return "tasks";
}

export const STATIC_BOARD_META = {
  launch: {
    title: "Задачи запуска",
    description: "Основной чек-лист запуска: задачи, ответственные, сроки и статус готовности.",
  },
  knowledgeBase: {
    title: "База знаний",
    description: "Презентация, FAQ, ролики, White Paper, MLM-материалы, вебинары и инструкции.",
  },
  ideas: {
    title: "Идеи",
    description: "Контент, комьюнити, маркетинг, вебинары, smart-contract и продуктовые гипотезы.",
  },
  videoScripts: {
    title: "Ролики",
    description: "Сценарии и ТЗ для роликов: тексты, формат, длительность и комментарии для правок.",
  },
  contentPlan: {
    title: "Контент-план",
    description: "SMM-план Atlas по соцсетям, датам, форматам, статусам, текстам и комментариям для правок.",
  },
  materials: {
    title: "Материалы",
    description: "Быстрый вход в Google Docs и рабочие документы команды по всем направлениям.",
  },
  presentation: {
    title: "Презентация",
    description: "Универсальная презентация Atlas System: согласованный текст и финальные изображения слайдов.",
  },
  productLibrary: {
    title: "Библиотека",
    description: "Мини-библиотека продуктов Atlas / PUP: CRM, аналитика, AI и новые направления.",
  },
  socialSubscriptions: {
    title: "Подписки",
    description: "Рабочий список аккаунтов и каналов, на которые должны быть подписаны соцсети Atlas.",
  },
  developments: {
    title: "Разработки",
    description: "Реестр продуктовых и технических направлений, идей, статусов и следующих шагов.",
  },
  crmBoard: {
    title: "CRM-доска",
    description: "Встроенная CRM-доска для командной работы, задач, лидов и операционного контроля.",
  },
  parser: {
    title: "Парсер",
    description: "Рабочий инструмент поиска, отбора и обработки лидов для маркетинга и SMM.",
  },
  telegramParser: {
    title: "Парсер по Telegram-каналам",
    description: "Поиск и обработка Telegram-каналов по странам: крипта, DeFi, NFT, smart-contract, Web3 и похожие проекты.",
  },
  influencers: {
    title: "Инфлюенсеры",
    description: "Рабочий список потенциальных инфлюенсеров и сообществ из YouTube, Facebook, X и Telegram для Atlas outreach.",
  },
  agentTasks: {
    title: "Параметры",
    description: "Параметры и факты проекта для AI-агента: Web3, циклы, партнерка, DAO, риски и ссылки.",
  },
  agentDataset: {
    title: "Датасет",
    description: "Редактируемые обучающие пары и блоки: о проекте, пост-ответы, терминология, программа и правила агента.",
  },
  agentFaq: {
    title: "FAQ",
    description: "Готовая база вопросов участников по регистрации, кошельку, тарифам, Claim, безопасности и поддержке.",
  },
  ceoPresentation: {
    title: "CEO-презентация",
    description: "Согласованные 9 слайдов: визуальное ТЗ и текст Архитектора для production-ролика.",
  },
  whitePaper: {
    title: "White Paper",
    description: "Рабочая структура White Paper: разделы, текстовые блоки, статусы вычитки и заметки.",
  },
  atlasInstructions: {
    title: "Инструкции",
    description: "База знаний Atlas: пошаговые гайды, короткие GIF/видео-фрагменты, FAQ и кнопки на полные ролики.",
  },
  legalDocs: {
    title: "Документы",
    description: "Международный пакет документов для smart-contract проекта: правила протокола, риски, интерфейс, privacy, партнерка и безопасность.",
  },
  terminology: {
    title: "Терминология",
    description: "Глоссарий Atlas System: термины, понятные описания, категории и комментарии для вычитки.",
  },
  localization: {
    title: "Локализация",
    description: "Localization Bible Atlas: языки сайта, glossary, запретные переводы, AI-prompts и QA переводов.",
  },
  securityReview: {
    title: "Security Review",
    description: "Внутренняя проверка smart-contract: взломоустойчивость, owner-полномочия, Transport, LP-риски и публичные формулировки.",
  },
  codexSystem: {
    title: "Codex OS",
    description: "Суперсистема работы с Codex: PRD, маленькие задачи, review-loop, security gate, refactoring и автоматизации.",
  },
  marketing: {
    title: "Маркетинг",
    description: "Маркетинговый чек-лист: парсеры, рассылки, короткие ролики, почта, адаптация и команда.",
  },
  dailyTasks: {
    title: "Ближайшие задачи",
    description: "Оперативная доска команды: карточки задач, исполнители, дедлайны, материалы и чат по каждой задаче.",
  },
};

const STATIC_BOARD_RENDERERS = {
  materials: () => <MaterialsLinksBoard />,
  contentPlan: () => <ContentPlanBoard />,
  images: () => <ImageContentBoard />,
  presentation: () => <PresentationContentTab />,
  productLibrary: () => <ProductLibraryBoard />,
  socialSubscriptions: () => <SocialSubscriptionsBoard />,
  developments: () => <DevelopmentsRegistry />,
  crmBoard: ({ analyticsBoardUrl }) => <AnalyticsBoardEmbed boardUrl={analyticsBoardUrl} variant="inline" />,
  parser: () => <ParserWorkspacePanel />,
  telegramParser: () => <ParserWorkspacePanel initialTab="telegram" />,
  influencers: () => <ParserWorkspacePanel initialTab="influencers" />,
  videoScripts: () => <VideoScriptsBoard />,
  agentTasks: () => <AgentKnowledgeTemplate />,
  agentDataset: () => <AgentTrainingDataset />,
  agentFaq: () => <AgentFaqTemplate />,
  ceoPresentation: () => <AtlasPresentationBoard />,
  whitePaper: () => <WhitePaperBoard />,
  atlasInstructions: () => <WhitePaperBoard initialView="atlasInstructions" boardId="atlasInstructions" />,
  legalDocs: () => <LegalDocumentsBoard />,
  terminology: () => <AgentTerminologyTemplate />,
  localization: () => <LocalizationBibleBoard />,
  securityReview: () => <SecurityReviewBoard />,
  codexSystem: () => <CodexSystemBoard />,
  dailyTasks: () => <DailyTasksBoard />,
};

function StaticLaunchBoard({ boardId, analyticsBoardUrl }) {
  const renderBoard = STATIC_BOARD_RENDERERS[boardId];
  if (!renderBoard) return null;

  return (
    <Wrapper as="section" marginTop="lg">
      {renderBoard({ analyticsBoardUrl })}
    </Wrapper>
  );
}

export default StaticLaunchBoard;
