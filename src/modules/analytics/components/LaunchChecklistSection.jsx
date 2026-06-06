import { useEffect, useState } from "react";
import ContentPlanBoard from "./ContentPlanBoard";
import DailyTasksBoard from "./DailyTasksBoard";
import AgentFaqTemplate from "./AgentFaqTemplate";
import AgentKnowledgeTemplate from "./AgentKnowledgeTemplate";
import AgentTerminologyTemplate from "./AgentTerminologyTemplate";
import AgentTrainingDataset from "./AgentTrainingDataset";
import AnalyticsActionButton from "./AnalyticsActionButton";
import AtlasPresentationBoard from "./AtlasPresentationBoard";
import LaunchProgressBar from "./LaunchProgressBar";
import LaunchEditableCell from "./LaunchEditableCell";
import LegalDocumentsBoard from "./LegalDocumentsBoard";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import MaterialsLinksBoard from "./MaterialsLinksBoard";
import PresentationContentTab from "./PresentationContentTab";
import ProductLibraryBoard from "./ProductLibraryBoard";
import SecurityReviewBoard from "./SecurityReviewBoard";
import TransportRiskFaqBoard from "./TransportRiskFaqBoard";
import VideoScriptsBoard from "./VideoScriptsBoard";
import Wrapper from "./Wrapper";
import WhitePaperBoard from "./WhitePaperBoard";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const LAUNCH_CHECKLIST_STORAGE_KEY = "atlas.analytics.launchChecklist.tasks.v3";
export const KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY = "atlas.analytics.knowledgeBaseChecklist.tasks.v1";
export const IDEAS_CHECKLIST_STORAGE_KEY = "atlas.analytics.ideasChecklist.tasks.v1";
export const MARKETING_CHECKLIST_STORAGE_KEY = "atlas.analytics.marketingChecklist.tasks.v1";
export const TASK_ARCHIVE_STORAGE_KEY = "atlas.analytics.taskArchive.v1";
export const TASK_HISTORY_STORAGE_KEY = "atlas.analytics.taskHistory.v1";
const DAILY_TASKS_STORAGE_KEY = "atlas.analytics.dailyTasks.2026-05-22.v1";
const TASK_CATEGORY_STORAGE_PREFIX = "atlas.analytics.taskCategoryChecklist";
const CUSTOM_CHECKLISTS_STORAGE_KEY = "atlas.analytics.customChecklists.v1";
const LAUNCH_STATUSES = ["В работе", "Не в работе", "Готово", "Отложено"];
const LAUNCH_PRIORITIES = ["Срочно", "Высокий", "Средний", "Низкий"];
const TASK_ASSIGNEES = ["", "Bruno", "Digitex", "Gem", "Rotenberg"];
const DEFAULT_BOARD_ID = "launch";
const TASK_CATEGORY_BOARDS = [
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
const STATIC_BOARD_IDS = ["launch", "knowledgeBase", "ideas", "dailyTasks", "videoScripts", "materials", "presentation", "productLibrary", "agentTasks", "agentDataset", "agentFaq", "ceoPresentation", "whitePaper", "legalDocs", "terminology", "securityReview", "transportRiskFaq", "contentPlan", "marketing"];
const STATIC_BOARD_META = {
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
    title: "Продукты",
    description: "Мини-библиотека продуктов Atlas / PUP: CRM, аналитика, AI и новые направления.",
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
  legalDocs: {
    title: "Документы",
    description: "Международный пакет документов для smart-contract проекта: правила протокола, риски, интерфейс, privacy, партнёрка и безопасность.",
  },
  terminology: {
    title: "Терминология",
    description: "Глоссарий Atlas System: термины, понятные описания, категории и комментарии для вычитки.",
  },
  securityReview: {
    title: "Security Review",
    description: "Внутренняя проверка smart-contract: взломоустойчивость, owner-полномочия, Transport, LP-риски и публичные формулировки.",
  },
  transportRiskFaq: {
    title: "Audit Risk FAQ",
    description: "Пояснение к audit-risk по privileged Transport-функции, administrative trust risk, multisig, on-chain traceability и публичным формулировкам.",
  },
  marketing: {
    title: "Маркетинг",
    description: "Маркетинговый чек-лист: парсеры, рассылки, короткие ролики, почта, адаптация и команда.",
  },
  dailyTasks: {
    title: "Задачи на день",
    description: "Фокус-команда на 22 мая: карточки задач, дедлайны, ответственные, материалы и чат по каждой задаче.",
  },
};

export const defaultLaunchChecklistTasks = [
  {
    id: "github-audit",
    title: "Самостоятельный аудит с помощью GitHub",
    responsible: "Разработка",
    comment: "Проверить репозитории, актуальные ветки, коммиты, PR, деплой и список технических хвостов перед Beta.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "admin-panel",
    title: "Разработать админ-панель",
    responsible: "Backend / frontend",
    comment: "Взять у Иванова API, уточнить язык профиля и собрать базовые действия для управления проектом.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "partner-video-translations",
    title: "Перевести ролик по партнерке на языки",
    responsible: "Контент / перевод",
    comment: "Уточнить нужные языки, подготовить переводы, проверить смысл партнерской механики и терминологию.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "cycle-video",
    title: "Ролик «Как работает цикл»",
    responsible: "Контент / продукт",
    comment: "Объяснить путь участника: подключение MetaMask, выбор тарифа, создание цикла, ожидание завершения и claim.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "ideology-video",
    title: "Идеологический ролик",
    responsible: "Контент / маркетинг",
    comment: "Собрать короткое позиционирование проекта: зачем он нужен, какую проблему решает и почему участнику понятно начинать.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "knowledge-base",
    title: "База знаний",
    responsible: "Контент / продукт",
    comment: "Наполнить разделы: презентация (вычитать), FAQ, ролики, White Paper, материалы по MLM, вебинары и инструкции.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "registration-cycle-video",
    title: "Ролик 30 сек про регистрацию и создание цикла",
    responsible: "Контент / обучение",
    comment: "Пошаговая инструкция: подключить MetaMask, зайти в циклы, выбрать тариф, подтвердить транзакцию и увидеть активный цикл.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "brandbook-upload",
    title: "Брендбук",
    responsible: "Дизайн / продукт",
    comment: "Подготовить брендбук и залить его в личный кабинет или базу знаний, чтобы команда брала материалы из одного места.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
];

export const defaultKnowledgeBaseChecklistTasks = [
  {
    id: "kb-presentation",
    title: "Презентация",
    responsible: "Контент / продукт",
    assignee: "",
    comment: "Вычитать презентацию, проверить структуру, формулировки, цифры, механику циклов и партнерской программы.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-faq",
    title: "FAQ",
    responsible: "Поддержка / продукт",
    assignee: "",
    comment: "Собрать частые вопросы по MetaMask, регистрации, циклам, claim, reinvest, тарифам и партнерке.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-videos",
    title: "Ролики",
    responsible: "Контент / маркетинг",
    assignee: "",
    comment: "Собрать и разложить обучающие ролики: партнерка, как работает цикл, идеология, регистрация и создание цикла.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-white-paper",
    title: "White Paper",
    responsible: "Продукт / юридический",
    assignee: "",
    comment: "Подготовить или актуализировать White Paper: экономика, smart-contract механика, тарифы, комиссии и риски.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-mlm-materials",
    title: "Материалы по MLM",
    responsible: "Продукт / партнерка",
    assignee: "",
    comment: "Продумать материалы по MLM: статусы, уровни, компрессия, matching bonus и понятная схема начислений.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-webinars",
    title: "Вебинары",
    responsible: "Обучение / маркетинг",
    assignee: "",
    comment: "Подготовить раздел для вебинаров: расписание, записи, темы, ссылки и ответственных за проведение.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
  {
    id: "kb-instructions",
    title: "Инструкции",
    responsible: "Поддержка / продукт",
    assignee: "",
    comment: "Собрать пошаговые инструкции по регистрации, подключению кошелька, покупке цикла, claim и повторному депозиту.",
    dueDate: "15.05.2026",
    status: "В работе",
  },
];

export const defaultIdeasChecklistTasks = [
  {
    id: "ideas-unity-proverb",
    title: "Ежедневная пословица про силу единства",
    responsible: "Контент / комьюнити",
    assignee: "",
    comment: "Подготовить рубрику ежедневных коротких постов про объединение, взаимопомощь и силу единства.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-audience-import",
    title: "Собрать аудитории Bitnest, PotokCash и сетевых чатов",
    responsible: "Маркетинг / лидогенерация",
    assignee: "",
    comment: "Скачать или собрать участников Bitnest, PotokCash, чаты сетевых компаний, розыгрышей и вебинаров для дальнейшего прогрева.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-webinar-schedule",
    title: "Расписание вебинаров на сайт",
    responsible: "Вебинары / обучение",
    assignee: "",
    comment: "Сделать еженедельный большой вебинар и дать активным участникам возможность вести вебинары по языкам за доп. вознаграждение в личном кабинете.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-leader-mailing",
    title: "Рассылка по лидерам",
    responsible: "Коммуникации / лидеры",
    assignee: "",
    comment: "Написать текст рассылки для лидеров, отдельно подготовить письмо лидеру мнений и сценарий первого касания.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-internal-name",
    title: "Название внутренней системы",
    responsible: "Брендинг / продукт",
    assignee: "",
    comment: "Проработать название внутренней механики: 'внутряны' или PV, выбрать понятную терминологию для кабинета и материалов.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-social-warmup",
    title: "Соцсети и прогрев",
    responsible: "SMM / маркетинг",
    assignee: "",
    comment: "Завести соцсети, прогревать аудиторию, подготовить контент-план и рубрики под разные позиционирования.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-smart-contract-no-cabinet",
    title: "Статья: взаимодействие со smart-contract без кабинета",
    responsible: "Контент / Web3",
    assignee: "",
    comment: "Объяснить, как взаимодействовать со смарт-контрактом напрямую без личного кабинета: где смотреть контракт, как делать действия и какие риски.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-income-slide",
    title: "Слайд про ежемесячный доход",
    responsible: "Презентация / продажи",
    assignee: "",
    comment: "Сделать продающий слайд: ежемесячный доход, годовая перспектива, пример 'за год ты получишь 300' с корректными формулировками.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-partner-reinvest",
    title: "Реинвест с партнерского счета в smart-contract",
    responsible: "Продукт / smart-contract",
    assignee: "",
    comment: "Проработать сценарий реинвеста партнерского баланса обратно в смарт-контракт и отразить его в кабинете/аналитике.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-atlas-system-tree",
    title: "atlas-system.io и моделирование дерева",
    responsible: "Продукт / симуляции",
    assignee: "",
    comment: "Посмотреть atlas-system.io: как будет строиться дерево, как с рандомной вероятностью появляются лидеры, что можно использовать для симуляции.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-crypto-course",
    title: "Курс по крипте с инструментом дохода",
    responsible: "Обучение / продукт",
    assignee: "",
    comment: "Проработать курс по крипте с инструментом дохода 27% в месяц. Важно аккуратно проверить формулировки про гарантии дохода.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-chris-taylor-account",
    title: "Аккаунт под Криса Тейлора",
    responsible: "Брендинг / аккаунты",
    assignee: "",
    comment: "Зарегистрировать учетку и переименовать под Криса Тейлора, продумать легенду, аватар, био и правила использования.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-ref-landing",
    title: "Лендинги с закрепленной реферальной ссылкой",
    responsible: "Лендинги / реклама",
    assignee: "",
    comment: "Сделать отдельный лендинг под каждый вид рекламы, в каждом закреплять нужную реферальную ссылку и источник трафика.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-discord-plan",
    title: "Пошаговый план запуска Discord-сервера",
    responsible: "Комьюнити / Discord",
    assignee: "",
    comment: "Расписать структуру каналов, роли, правила, модерацию, welcome-сценарий, расписание активностей и onboarding.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-mutual-aid-articles",
    title: "Статьи о кассах взаимопомощи",
    responsible: "PR / контент",
    assignee: "",
    comment: "Заказать несколько статей о кассах взаимопомощи, их истории, механике и отличиях от классических инвестиционных продуктов.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-help-disclaimer",
    title: "Дисклеймер по запросам помощи",
    responsible: "Юридический / продукт",
    assignee: "",
    comment: "Сформулировать правило: любой запрос помощи не гарантирует ее получения. Добавить в правила участия и материалы.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-elite-plus",
    title: "Elite+ клуб",
    responsible: "Партнерка / клуб",
    assignee: "",
    comment: "Если Elite держится более 2 месяцев, участник попадает в Elite+: закрытые клубные обучения и оплачиваемые компанией поездки. Добавить блок в партнерку.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-positioning-landings",
    title: "4 варианта позиционирования и лендинги",
    responsible: "Маркетинг / позиционирование",
    assignee: "",
    comment: "Подготовить отдельные лендинги под позиционирования: касса взаимопомощи, money sharing, платформа взаимного финансирования, алгоритмическая модель коллективного распределения средств.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-performance-program",
    title: "Atlas Performance Program",
    responsible: "Партнерка / статусы",
    assignee: "",
    comment: "Показать механику развития, ступенчатые статусы, поздравление с достижением статуса и сколько дней участник держит статус.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-promotion-strategies",
    title: "Стратегии продвижения Atlas",
    responsible: "Маркетинг / стратегия",
    assignee: "",
    comment: "Разработать стратегии продвижения Atlas по каналам: лидеры, соцсети, вебинары, блогеры, лендинги, комьюнити и контент.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-smart-contract-bloggers",
    title: "Поиск блогеров по smart-contract проектам",
    responsible: "Research / инфлюенсеры",
    assignee: "",
    comment: "Найти блогеров, продвигающих проекты на смарт-контрактах; продумать YouTube-парсер и критерии отбора.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-superkopilka-research",
    title: "Изучить архив SuperKopilka FAQ",
    responsible: "Research / база знаний",
    assignee: "",
    comment: "Посмотреть архив FAQ SuperKopilka: https://web.archive.org/web/20220919061125/https://www.superkopilka.com/faq/ и вытащить полезную структуру вопросов.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-founder-registration-questions",
    title: "Вопросы про регистрацию и основателя",
    responsible: "FAQ / юридический",
    assignee: "",
    comment: "Проработать ответы на вопросы про регистрацию проекта, основателя, прозрачность, ответственность и правила участия.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-ama-binance-live",
    title: "AMA-сессия в формате Binance Live",
    responsible: "Комьюнити / эфиры",
    assignee: "",
    comment: "Проработать аналог AMA-сессии: формат, ведущие, вопросы, языки, запись, анонсы и follow-up материалы.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-epochs-dao",
    title: "Серии циклов / эпохи с DAO-перезапуском",
    responsible: "Продукт / DAO",
    assignee: "",
    comment: "Проработать идею серий циклов (эпох) с управляемым перезапуском через DAO: правила, триггеры, голосование, коммуникация.",
    dueDate: "",
    status: "Не в работе",
  },
  {
    id: "ideas-rules-core-content",
    title: "Базовые смысловые материалы Atlas",
    responsible: "База знаний / идеология",
    assignee: "",
    comment: "Подготовить материалы: правила участия и принцип работы Atlas, почему система может работать долго, кассы взаимопомощи, Web2 vs Web3, MLM.",
    dueDate: "",
    status: "Не в работе",
  },
];

export const defaultMarketingChecklistTasks = [
  {
    id: "marketing-youtube-parser",
    title: "Парсер YouTube с рассылкой",
    responsible: "Маркетинг / парсеры",
    assignee: "",
    comment: "Собрать инструмент для поиска и выгрузки релевантной аудитории/каналов YouTube и сценарий дальнейшей рассылки.",
    dueDate: "",
    status: "Не в работе",
    priority: "Высокий",
  },
  {
    id: "marketing-telegram-parser",
    title: "Парсер Telegram с рассылкой",
    responsible: "Маркетинг / Telegram",
    assignee: "",
    comment: "Подготовить парсер Telegram по чатам/каналам и механику аккуратной рассылки без риска блокировок.",
    dueDate: "",
    status: "Не в работе",
    priority: "Высокий",
  },
  {
    id: "marketing-social-parser",
    title: "Парсер по социальным сетям",
    responsible: "Маркетинг / соцсети",
    assignee: "",
    comment: "Проработать парсинг по VK, Instagram, LinkedIn, Facebook, Viber, WeChat, Line, KakaoTalk, Snapchat, Discord и другим соцсетям.",
    dueDate: "",
    status: "Не в работе",
    priority: "Высокий",
  },
  {
    id: "marketing-short-video-cuts",
    title: "Нарезки коротких роликов по гео",
    responsible: "Контент / видео",
    assignee: "",
    comment: "Организовать нарезки коротких роликов под разные гео; отдельно продумать парсер/поисковик тем и референсов.",
    dueDate: "",
    status: "Не в работе",
    priority: "Средний",
  },
  {
    id: "marketing-email-campaign",
    title: "Email-рассылка",
    responsible: "Email / рассылки",
    assignee: "",
    comment: "Собрать базовый сценарий email-рассылки: сегменты, тексты, прогрев, частота, домены и лимиты отправки.",
    dueDate: "",
    status: "Не в работе",
    priority: "Средний",
  },
  {
    id: "marketing-mailbox-flow",
    title: "Разобрать почту: приём и отправка",
    responsible: "Email / инфраструктура",
    assignee: "",
    comment: "Настроить рабочую почту: входящие, исходящие, роли, шаблоны ответов, доступы и контроль доставляемости.",
    dueDate: "",
    status: "Не в работе",
    priority: "Средний",
  },
  {
    id: "marketing-device-adaptation",
    title: "Адаптация под все устройства",
    responsible: "Frontend / QA",
    assignee: "",
    comment: "Проверить и адаптировать ключевые страницы под desktop, mobile, tablet и разные браузеры.",
    dueDate: "",
    status: "Не в работе",
    priority: "Высокий",
  },
  {
    id: "marketing-full-functional-check",
    title: "Проверка всего функционала полностью с ТЗ",
    responsible: "QA / продукт",
    assignee: "",
    comment: "Пройти весь функционал по техническому заданию: сценарии пользователя, формы, вкладки, ссылки, адаптив, роли и ошибки.",
    dueDate: "",
    status: "Не в работе",
    priority: "Срочно",
  },
  {
    id: "marketing-ai-employee",
    title: "AI-сотрудник для маркетинга и поддержки",
    responsible: "AI / автоматизация",
    assignee: "",
    comment: "Продумать AI-сотрудника в Telegram/кабинете: ответы, задачи, помощь участникам, сбор лидов и передача задач живым сотрудникам.",
    dueDate: "",
    status: "Не в работе",
    priority: "Высокий",
  },
  {
    id: "marketing-live-staff-board",
    title: "Добавление живых сотрудников",
    responsible: "Команда / CRM",
    assignee: "",
    comment: "Сделать возможность добавлять сотрудников с контактами, временем работы, задачами, уровнем доступа и доской по сотрудникам.",
    dueDate: "",
    status: "Не в работе",
    priority: "Средний",
  },
  {
    id: "marketing-manager-role",
    title: "Добавить роль «Менеджер»",
    responsible: "Продукт / роли",
    assignee: "",
    comment: "Добавить роль «Менеджер», определить права доступа, зоны ответственности и связь с задачами/сотрудниками.",
    dueDate: "",
    status: "Не в работе",
    priority: "Средний",
  },
];

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function createLaunchTask(overrides = {}) {
  return {
    id: `launch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    responsible: "",
    assignee: "",
    comment: "",
    dueDate: "",
    status: "В работе",
    priority: "Средний",
    done: false,
    ...overrides,
  };
}

function getLaunchStatusTone(status) {
  if (status === "Готово") return "done";
  if (status === "Отложено") return "paused";
  if (status === "Не в работе") return "idle";
  return "active";
}

function getLaunchPriorityTone(priority) {
  if (priority === "Срочно") return "urgent";
  if (priority === "Высокий") return "high";
  if (priority === "Низкий") return "low";
  return "medium";
}

function normalizeChecklistTasks(tasks) {
  return tasks.map((task) => ({
    priority: "Средний",
    assignee: "",
    done: false,
    focus: false,
    ...task,
  }));
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function readStoredTasks(storageKey, fallbackTasks) {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(storageKey);
    return normalizeChecklistTasks(saved ? JSON.parse(saved) : fallbackTasks);
  } catch {
    return normalizeChecklistTasks(fallbackTasks);
  }
}

function readStoredCustomChecklists() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(CUSTOM_CHECKLISTS_STORAGE_KEY);
    const checklists = saved ? JSON.parse(saved) : [];
    return checklists.map((checklist) => ({
      ...checklist,
      tasks: normalizeChecklistTasks(checklist.tasks || []),
    }));
  } catch {
    return [];
  }
}

function persistChecklistTasks(storageKey, nextTasks) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(nextTasks));
    saveServerContent(storageKey, nextTasks);
  } catch {
    // Если storage недоступен, чеклист всё равно работает до перезагрузки страницы.
  }
}

function patchChecklistTask(task, patch) {
  const next = { ...task, ...patch };
  if (patch.status === "Готово") next.done = true;
  if (patch.status && patch.status !== "Готово") next.done = false;
  if (patch.done === true) next.status = "Готово";
  if (patch.done === false && task.status === "Готово" && !patch.status) next.status = "В работе";
  return next;
}

function parseTaskDueDate(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const ruMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);

  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (ruMatch) {
    const date = new Date(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getTaskTiming(task) {
  if (task.done || task.status === "Готово") return "done";
  const dueDate = parseTaskDueDate(task.dueDate);
  if (!dueDate) return "no-date";

  const today = getStartOfDay();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  if (dueDate < today) return "overdue";
  if (dueDate.getTime() === today.getTime()) return "today";
  if (dueDate <= weekEnd) return "week";
  return "later";
}

function formatHistoryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function shouldLogTaskPatch(patch) {
  return Object.keys(patch).some((key) => ["assignee", "status", "done", "priority", "focus"].includes(key));
}

function LaunchChecklistSection({ mode = "tasks" }) {
  const [activeBoard, setActiveBoard] = useState(() => {
    const fallbackBoard = mode === "content" ? "materials" : DEFAULT_BOARD_ID;
    if (typeof window === "undefined") return fallbackBoard;

    const url = new URL(window.location.href);
    if (url.searchParams.get("b") === "d") return "dailyTasks";
    return url.searchParams.get("board") || fallbackBoard;
  });
  const [launchTasks, setLaunchTasks] = useState(() => readStoredTasks(LAUNCH_CHECKLIST_STORAGE_KEY, defaultLaunchChecklistTasks));
  const [knowledgeBaseTasks, setKnowledgeBaseTasks] = useState(() => readStoredTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, defaultKnowledgeBaseChecklistTasks));
  const [ideaTasks, setIdeaTasks] = useState(() => readStoredTasks(IDEAS_CHECKLIST_STORAGE_KEY, defaultIdeasChecklistTasks));
  const [marketingTasks, setMarketingTasks] = useState(() => readStoredTasks(MARKETING_CHECKLIST_STORAGE_KEY, defaultMarketingChecklistTasks));
  const [taskCategoryTasks, setTaskCategoryTasks] = useState(() => Object.fromEntries(
    TASK_CATEGORY_BOARDS.map((board) => [board.id, readStoredTasks(board.storageKey, [])]),
  ));
  const [dailyTasksCount, setDailyTasksCount] = useState(0);
  const [customChecklists, setCustomChecklists] = useState(readStoredCustomChecklists);
  const [newTask, setNewTask] = useState(() => createLaunchTask({ status: "В работе" }));
  const [newChecklistName, setNewChecklistName] = useState("");
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [taskArchive, setTaskArchive] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(LAUNCH_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setLaunchTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setKnowledgeBaseTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(IDEAS_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setIdeaTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(MARKETING_CHECKLIST_STORAGE_KEY).then((tasks) => {
      if (isMounted && tasks) setMarketingTasks(normalizeChecklistTasks(tasks));
    });
    loadServerContent(DAILY_TASKS_STORAGE_KEY).then((tasks) => {
      if (isMounted && Array.isArray(tasks)) setDailyTasksCount(tasks.length);
    });
    TASK_CATEGORY_BOARDS.forEach((board) => {
      loadServerContent(board.storageKey).then((tasks) => {
        if (!isMounted || !tasks) return;
        setTaskCategoryTasks((current) => ({
          ...current,
          [board.id]: normalizeChecklistTasks(tasks),
        }));
      });
    });
    loadServerContent(CUSTOM_CHECKLISTS_STORAGE_KEY).then((checklists) => {
      if (!isMounted || !Array.isArray(checklists)) return;
      setCustomChecklists(checklists.map((checklist) => ({ ...checklist, tasks: normalizeChecklistTasks(checklist.tasks || []) })));
    });
    loadServerContent(TASK_ARCHIVE_STORAGE_KEY).then((items) => {
      if (isMounted) setTaskArchive(normalizeArray(items));
    });
    loadServerContent(TASK_HISTORY_STORAGE_KEY).then((items) => {
      if (isMounted) setTaskHistory(normalizeArray(items));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const isKnowledgeBaseBoard = activeBoard === "knowledgeBase";
  const isIdeasBoard = activeBoard === "ideas";
  const isDailyTasksBoard = activeBoard === "dailyTasks";
  const isContentPlanBoard = activeBoard === "contentPlan";
  const isVideoScriptsBoard = activeBoard === "videoScripts";
  const isMaterialsBoard = activeBoard === "materials";
  const isPresentationBoard = activeBoard === "presentation";
  const isProductLibraryBoard = activeBoard === "productLibrary";
  const isAgentTasksBoard = activeBoard === "agentTasks";
  const isAgentDatasetBoard = activeBoard === "agentDataset";
  const isAgentFaqBoard = activeBoard === "agentFaq";
  const isCeoPresentationBoard = activeBoard === "ceoPresentation";
  const isWhitePaperBoard = activeBoard === "whitePaper";
  const isLegalDocsBoard = activeBoard === "legalDocs";
  const isTerminologyBoard = activeBoard === "terminology";
  const isSecurityReviewBoard = activeBoard === "securityReview";
  const isTransportRiskFaqBoard = activeBoard === "transportRiskFaq";
  const isMarketingBoard = activeBoard === "marketing";
  const activeTaskCategoryBoard = TASK_CATEGORY_BOARDS.find((board) => board.id === activeBoard);
  const isTaskCategoryBoard = Boolean(activeTaskCategoryBoard);
  const isStaticContentBoard = isDailyTasksBoard || isContentPlanBoard || isVideoScriptsBoard || isMaterialsBoard || isPresentationBoard || isProductLibraryBoard || isAgentTasksBoard || isAgentDatasetBoard || isAgentFaqBoard || isCeoPresentationBoard || isWhitePaperBoard || isLegalDocsBoard || isTerminologyBoard || isSecurityReviewBoard || isTransportRiskFaqBoard;
  const activeCustomChecklist = customChecklists.find((checklist) => checklist.id === activeBoard);
  const isCustomBoard = Boolean(activeCustomChecklist);
  const visibleTasks = isStaticContentBoard ? [] : isTaskCategoryBoard ? taskCategoryTasks[activeBoard] || [] : isCustomBoard ? activeCustomChecklist.tasks : isMarketingBoard ? marketingTasks : isIdeasBoard ? ideaTasks : isKnowledgeBaseBoard ? knowledgeBaseTasks : launchTasks;
  const filteredVisibleTasks = assigneeFilter ? visibleTasks.filter((task) => (task.assignee || "Не назначен") === assigneeFilter) : visibleTasks;
  const completedCount = visibleTasks.filter((task) => task.done || task.status === "Готово").length;
  const progress = visibleTasks.length ? (completedCount / visibleTasks.length) * 100 : 0;
  const boardArchive = taskArchive.filter((item) => item.boardId === activeBoard).slice(0, 8);
  const boardHistory = taskHistory.filter((item) => item.boardId === activeBoard).slice(0, 6);
  const activeAssignees = Array.from(new Set([...TASK_ASSIGNEES.filter(Boolean), ...visibleTasks.map((task) => task.assignee).filter(Boolean)])).sort((first, second) => first.localeCompare(second, "ru"));
  const activeTimingStats = visibleTasks.reduce(
    (result, task) => {
      const timing = getTaskTiming(task);
      if (timing === "overdue") result.overdue += 1;
      if (timing === "today") result.today += 1;
      if (timing === "week") result.week += 1;
      if (task.focus && !(task.done || task.status === "Готово")) result.focus += 1;
      return result;
    },
    { overdue: 0, today: 0, week: 0, focus: 0 },
  );
  const boardTitle = isTaskCategoryBoard ? activeTaskCategoryBoard.title : isCustomBoard ? activeCustomChecklist.title : isDailyTasksBoard ? "Задачи на день" : isMarketingBoard ? "Задачи по маркетингу" : isIdeasBoard ? "Идеи" : isKnowledgeBaseBoard ? "Задачи базы знаний" : "Задачи запуска";
  const boardSubtitle = isCustomBoard
    ? "Пользовательский чек-лист с собственным набором задач."
    : isTaskCategoryBoard
      ? activeTaskCategoryBoard.description
    : isDailyTasksBoard
      ? "Карточки фокуса на 22 мая: дедлайны, ответственные, материалы и чат по каждой задаче."
    : isIdeasBoard
      ? "Сырые идеи разложены по направлениям, чтобы их можно было приоритизировать и превращать в задачи."
    : isContentPlanBoard
      ? "Редактируемый SMM-план Atlas: соцсети, даты, форматы, статусы, тексты, сценарии и комментарии по правкам."
    : isVideoScriptsBoard
      ? "Сценарии и ТЗ для роликов: можно читать, редактировать текущие тексты и добавлять новые ролики."
    : isMaterialsBoard
      ? "Карта Google Docs и Drive-ссылок по разделам: ТЗ, кабинет, ролики, документы, исследования и маркетинг."
    : isPresentationBoard
      ? "Рабочая сборка универсальной презентации: слева список слайдов, справа согласованный текст и финальная картинка."
    : isProductLibraryBoard
      ? "Мини-библиотека продуктов, чтобы не путаться между CRM, аналитикой, Atlas AI и новыми направлениями."
    : isAgentTasksBoard
      ? "Editable-документ параметров для обучения AI-агента Atlas System."
    : isAgentDatasetBoard
      ? "Editable-датасет для обучения агентов: блоки, prompt/response пары, источники и правила вычитки."
    : isAgentFaqBoard
      ? "Editable FAQ по вопросам участников и ответам AI-агента."
    : isCeoPresentationBoard
      ? "Согласованные слайды CEO-презентации: визуальное ТЗ и текст Архитектора."
    : isWhitePaperBoard
      ? "White Paper разложен по разделам: можно постепенно добавлять текст, редактировать и вычитывать каждый блок отдельно."
    : isTerminologyBoard
      ? "Editable-глоссарий терминов Atlas System по категориям: Web3, циклы, партнерка, DAO, юридика и коммуникации."
    : isSecurityReviewBoard
      ? "Security Review V1: отделяем внешний взлом от архитектурных полномочий и собираем доказательную базу проверок."
    : isTransportRiskFaqBoard
      ? "Пояснение к аудиту: как читать High/Critical risk по Transport, owner powers и гибридной архитектуре Atlas Core V1."
    : isMarketingBoard
      ? "Маркетинговые задачи с фото: парсеры, рассылки, короткие ролики, почта, адаптация, QA и роли команды."
    : isKnowledgeBaseBoard
      ? "Материалы, которые нужно подготовить и вычитать для базы знаний."
      : "Что нужно закрыть перед стартом";
  const boardDescription = isCustomBoard
    ? `Чек-лист «${activeCustomChecklist.title}»: добавляй задачи, назначай исполнителей и веди статусы.`
    : isTaskCategoryBoard
      ? activeTaskCategoryBoard.emptyHint
    : isDailyTasksBoard
      ? "Здесь можно быстро собрать задачи на день, поделиться ими с ребятами и вести обсуждение отдельно внутри каждой задачи."
    : isIdeasBoard
      ? "Здесь вычитаны и структурированы идеи по контенту, комьюнити, партнерке, лендингам, smart-contract, вебинарам и исследованиям."
    : isContentPlanBoard
      ? "Здесь можно вести контент-план удобнее, чем в PDF: фильтровать по соцсетям и датам, редактировать тексты, ставить статусы и оставлять комментарии по правкам."
    : isVideoScriptsBoard
      ? "Здесь хранятся тексты и ТЗ для роликов: название, формат, длительность, комментарий и полный сценарий, который можно редактировать прямо в аналитике."
    : isMaterialsBoard
      ? "Здесь можно хранить такую же таблицу ссылок, как в Google Sheets: открыл документ, доработал и вернулся в аналитику."
    : isPresentationBoard
      ? "Здесь фиксируем только то, что уже согласовано: понятную формулировку для новичка, визуал слайда и статус готовности. Каждый следующий слайд добавляется отдельным пунктом."
    : isProductLibraryBoard
      ? "Здесь можно быстро добавить продукт, закрепить ответственного, статус, ссылку и короткое описание."
    : isAgentTasksBoard
      ? "Здесь собраны параметры проекта, Web3, циклы, партнерка, DAO, юридика, риски, FAQ и ссылки на источники для AI-агента."
    : isAgentDatasetBoard
      ? "Здесь можно вести датасет для обучения агентов: о проекте, пост-ответы, терминологию, полную программу, пятерку правил и базовую программу диалога."
    : isAgentFaqBoard
      ? "Здесь собрана база вопросов участников по категориям: регистрация, кошелек, депозиты, тарифы, Claim, партнерка, безопасность и поддержка."
    : isCeoPresentationBoard
      ? "Здесь сохраняется approved-сценарий CEO-ролика Atlas System: 9 слайдов, отдельно ТЗ для визуала и речь Архитектора."
    : isWhitePaperBoard
      ? "Здесь сохраняется структура White Paper: каждый раздел отдельным блоком, со статусом, основным текстом и заметками для вычитки."
    : isTerminologyBoard
      ? "Здесь можно вычитывать терминологию Atlas: название термина, понятное описание, комментарий и спорные формулировки по категориям."
    : isSecurityReviewBoard
      ? "Здесь собираем ручной review, автоматические проверки, инварианты, fuzzing-сценарии, тестнет battle test и публичные формулировки без слова Audited."
    : isTransportRiskFaqBoard
      ? "Здесь собраны ответы для человека, который увидит в аудите риск Transport: что он означает, почему он есть, почему multisig не убирает риск полностью и как сверять Transport-операции on-chain."
    : isMarketingBoard
      ? "Здесь собраны маркетинговые задачи: парсинг YouTube/Telegram/соцсетей, email-рассылки, короткие видео, проверка функционала, AI-сотрудник и роль менеджера."
    : isKnowledgeBaseBoard
      ? "Здесь собраны презентация, FAQ, ролики, White Paper, MLM-материалы, вебинары и инструкции из фото."
      : "Здесь собраны задачи, ответственные, сроки и комментарии по тому, что нужно закрыть перед запуском проекта.";
  const taskBoardTabs = [
    { id: "inboxTasks", label: "Входящие" },
    { id: "launch", label: "Задачи запуска" },
    { id: "marketing", label: "Маркетинг" },
    { id: "smmTasks", label: "SMM" },
    { id: "siteTasks", label: "Сайт" },
    { id: "contentTasks", label: "Контент" },
    { id: "designTasks", label: "Дизайн" },
    { id: "legalTasks", label: "Legal" },
    { id: "techTasks", label: "Tech" },
    { id: "knowledgeBase", label: "Задачи по базе знаний" },
    { id: "ideas", label: "Идеи" },
    { id: "dailyTasks", label: "Задачи на день" },
  ];
  const contentBoardTabs = [
    { id: "contentPlan", label: "Контент-план" },
    { id: "materials", label: "Материалы" },
    { id: "presentation", label: "Презентация" },
    { id: "productLibrary", label: "Продукты" },
    { id: "agentTasks", label: "Параметры" },
    { id: "agentDataset", label: "Датасет" },
    { id: "agentFaq", label: "FAQ" },
    { id: "ceoPresentation", label: "CEO-презентация" },
    { id: "whitePaper", label: "White Paper" },
    { id: "legalDocs", label: "Документы" },
    { id: "videoScripts", label: "Ролики" },
    { id: "terminology", label: "Терминология" },
    { id: "securityReview", label: "Security Review" },
    { id: "transportRiskFaq", label: "Audit Risk FAQ" },
  ];
  const visibleBoardTabs = mode === "content" ? contentBoardTabs : taskBoardTabs;

  function getBoardTaskCount(boardId) {
    if (boardId === "launch") return launchTasks.length;
    if (boardId === "marketing") return marketingTasks.length;
    if (boardId === "knowledgeBase") return knowledgeBaseTasks.length;
    if (boardId === "ideas") return ideaTasks.length;
    if (boardId === "dailyTasks") return dailyTasksCount;
    if (taskCategoryTasks[boardId]) return taskCategoryTasks[boardId].length;
    const customChecklist = customChecklists.find((checklist) => checklist.id === boardId);
    return customChecklist ? normalizeArray(customChecklist.tasks).length : null;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visibleBoardIds = visibleBoardTabs.map((tab) => tab.id);
    const fallbackBoard = mode === "content" ? "materials" : DEFAULT_BOARD_ID;
    const isKnownBoard = visibleBoardIds.includes(activeBoard) || (mode === "tasks" && customChecklists.some((checklist) => checklist.id === activeBoard));
    const nextBoard = isKnownBoard ? activeBoard : fallbackBoard;

    if (nextBoard !== activeBoard) {
      setActiveBoard(nextBoard);
      return;
    }

    const url = new URL(window.location.href);
    if (nextBoard === fallbackBoard) {
      url.searchParams.delete("board");
    } else {
      url.searchParams.set("board", nextBoard);
    }
    window.history.replaceState({}, "", url.toString());
  }, [activeBoard, customChecklists, mode]);

  function persistArchive(nextArchive) {
    try {
      window.localStorage.setItem(TASK_ARCHIVE_STORAGE_KEY, JSON.stringify(nextArchive));
      saveServerContent(TASK_ARCHIVE_STORAGE_KEY, nextArchive);
    } catch {
      // Архив остаётся в состоянии страницы, если storage временно недоступен.
    }
  }

  function persistHistory(nextHistory) {
    try {
      window.localStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      saveServerContent(TASK_HISTORY_STORAGE_KEY, nextHistory);
    } catch {
      // История не должна блокировать работу с задачами.
    }
  }

  function pushTaskHistory(action, task, details = "") {
    const entry = {
      id: `history-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      boardId: activeBoard,
      boardTitle,
      taskId: task.id,
      taskTitle: task.title || "Без названия",
      action,
      details,
      createdAt: new Date().toISOString(),
    };

    setTaskHistory((current) => {
      const next = [entry, ...current].slice(0, 240);
      persistHistory(next);
      return next;
    });
  }

  function getBoardUpdater() {
    if (isTaskCategoryBoard) {
      return {
        storageKey: activeTaskCategoryBoard.storageKey,
        setTasks: (updater) => {
          setTaskCategoryTasks((current) => {
            const currentTasks = current[activeBoard] || [];
            const nextTasks = typeof updater === "function" ? updater(currentTasks) : updater;
            return {
              ...current,
              [activeBoard]: nextTasks,
            };
          });
        },
      };
    }
    if (isMarketingBoard) return { storageKey: MARKETING_CHECKLIST_STORAGE_KEY, setTasks: setMarketingTasks };
    if (isIdeasBoard) return { storageKey: IDEAS_CHECKLIST_STORAGE_KEY, setTasks: setIdeaTasks };
    if (isKnowledgeBaseBoard) return { storageKey: KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setTasks: setKnowledgeBaseTasks };
    return { storageKey: LAUNCH_CHECKLIST_STORAGE_KEY, setTasks: setLaunchTasks };
  }

  function updateTasks(storageKey, setTasks, updater) {
    setTasks((current) => {
      const next = updater(current);
      persistChecklistTasks(storageKey, next);
      return next;
    });
  }

  function updateTask(taskId, patch) {
    const taskBefore = visibleTasks.find((task) => task.id === taskId);

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => {
          if (checklist.id !== activeBoard) return checklist;
          return {
            ...checklist,
            tasks: checklist.tasks.map((task) => (task.id === taskId ? patchChecklistTask(task, patch) : task)),
          };
        });
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
      if (taskBefore && shouldLogTaskPatch(patch)) pushTaskHistory("Обновление", taskBefore, Object.keys(patch).join(", "));
      return;
    }

    const { storageKey, setTasks } = getBoardUpdater();
    updateTasks(storageKey, setTasks, (current) => current.map((task) => (task.id === taskId ? patchChecklistTask(task, patch) : task)));
    if (taskBefore && shouldLogTaskPatch(patch)) pushTaskHistory("Обновление", taskBefore, Object.keys(patch).join(", "));
  }

  function addTask() {
    const title = newTask.title.trim();
    if (!title) return;

    const task = createLaunchTask({
      title,
      responsible: newTask.responsible.trim() || (isTaskCategoryBoard ? activeTaskCategoryBoard.defaultResponsible : isMarketingBoard ? "Маркетинг / рост" : isIdeasBoard ? "Идеи / приоритизация" : isKnowledgeBaseBoard ? "Контент / продукт" : "Не назначено"),
      assignee: newTask.assignee.trim(),
      comment: newTask.comment.trim(),
      dueDate: newTask.dueDate,
      status: newTask.status || "В работе",
      priority: newTask.priority || "Средний",
      done: newTask.status === "Готово",
    });

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: [task, ...checklist.tasks] } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
      pushTaskHistory("Создание", task, "Добавлена новая задача");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isIdeasBoard) {
      updateTasks(IDEAS_CHECKLIST_STORAGE_KEY, setIdeaTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, "Добавлена новая идея");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isMarketingBoard) {
      updateTasks(MARKETING_CHECKLIST_STORAGE_KEY, setMarketingTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, "Добавлена маркетинговая задача");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isTaskCategoryBoard) {
      const { storageKey, setTasks } = getBoardUpdater();
      updateTasks(storageKey, setTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, `Добавлена задача в раздел «${activeTaskCategoryBoard.label}»`);
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isKnowledgeBaseBoard) {
      updateTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setKnowledgeBaseTasks, (current) => [task, ...current]);
      pushTaskHistory("Создание", task, "Добавлена задача базы знаний");
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    updateTasks(LAUNCH_CHECKLIST_STORAGE_KEY, setLaunchTasks, (current) => [task, ...current]);
    pushTaskHistory("Создание", task, "Добавлена задача запуска");
    setNewTask(createLaunchTask({ status: "В работе" }));
  }

  function removeTask(taskId) {
    const taskToArchive = visibleTasks.find((task) => task.id === taskId);
    if (!taskToArchive) return;

    const archiveItem = {
      ...taskToArchive,
      archiveId: `archive-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      boardId: activeBoard,
      boardTitle,
      archivedAt: new Date().toISOString(),
    };

    setTaskArchive((current) => {
      const next = [archiveItem, ...current].slice(0, 240);
      persistArchive(next);
      return next;
    });

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: checklist.tasks.filter((task) => task.id !== taskId) } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
      pushTaskHistory("Архив", taskToArchive, "Задача перенесена в архив");
      return;
    }

    const { storageKey, setTasks } = getBoardUpdater();
    updateTasks(storageKey, setTasks, (current) => current.filter((task) => task.id !== taskId));
    pushTaskHistory("Архив", taskToArchive, "Задача перенесена в архив");
  }

  function restoreArchivedTask(archiveId) {
    const archivedTask = taskArchive.find((task) => task.archiveId === archiveId);
    if (!archivedTask) return;

    const restoredTask = {
      ...archivedTask,
      id: archivedTask.id || `restored-${Date.now()}`,
      status: archivedTask.status || "В работе",
    };
    delete restoredTask.archiveId;
    delete restoredTask.boardId;
    delete restoredTask.boardTitle;
    delete restoredTask.archivedAt;

    setTaskArchive((current) => {
      const next = current.filter((task) => task.archiveId !== archiveId);
      persistArchive(next);
      return next;
    });

    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: [restoredTask, ...checklist.tasks] } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
    } else {
      const { storageKey, setTasks } = getBoardUpdater();
      updateTasks(storageKey, setTasks, (current) => [restoredTask, ...current]);
    }

    pushTaskHistory("Восстановление", restoredTask, "Задача возвращена из архива");
  }

  function addChecklist() {
    const title = newChecklistName.trim();
    if (!title) return;

    const checklist = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      tasks: [],
    };

    setCustomChecklists((current) => {
      const next = [...current, checklist];
      persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
      return next;
    });
    setActiveBoard(checklist.id);
    setNewChecklistName("");
    setIsCreatingChecklist(false);
    setEditingCell(null);
  }

  return (
    <>
      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-tab-summary analytics-launch-nav">
        <div className="analytics-launch-browser-tabs" role="tablist" aria-label="Разделы чеклиста запуска">
          {visibleBoardTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`analytics-launch-browser-tab${activeBoard === tab.id ? " analytics-launch-browser-tab-active" : ""}`}
              onClick={() => {
                setActiveBoard(tab.id);
                setEditingCell(null);
                setAssigneeFilter("");
              }}
            >
              <span>{tab.label}</span>
              {mode === "tasks" ? <span className="analytics-launch-tab-count">{getBoardTaskCount(tab.id) ?? 0}</span> : null}
            </button>
          ))}
          {mode === "tasks" ? customChecklists.map((checklist) => (
            <button
              key={checklist.id}
              type="button"
              className={`analytics-launch-browser-tab${activeBoard === checklist.id ? " analytics-launch-browser-tab-active" : ""}`}
              onClick={() => {
                setActiveBoard(checklist.id);
                setEditingCell(null);
                setAssigneeFilter("");
              }}
            >
              <span>{checklist.title}</span>
              <span className="analytics-launch-tab-count">{normalizeArray(checklist.tasks).length}</span>
            </button>
          )) : null}
          {mode === "tasks" && isCreatingChecklist ? (
            <form
              className="analytics-launch-new-checklist"
              onSubmit={(event) => {
                event.preventDefault();
                addChecklist();
              }}
            >
              <input
                className="analytics-launch-new-checklist-input"
                value={newChecklistName}
                onChange={(event) => setNewChecklistName(event.target.value)}
                placeholder="Название чек-листа"
                autoFocus
              />
              <button type="submit" className="analytics-launch-new-checklist-save" aria-label="Создать чек-лист">
                +
              </button>
            </form>
          ) : mode === "tasks" ? (
            <button type="button" className="analytics-launch-browser-tab analytics-launch-browser-tab-add" onClick={() => setIsCreatingChecklist(true)}>
              +
            </button>
          ) : null}
        </div>
        </div>
      </Wrapper>

      {isMaterialsBoard ? <Wrapper as="section" marginTop="lg"><MaterialsLinksBoard /></Wrapper> : null}
      {isContentPlanBoard ? <Wrapper as="section" marginTop="lg"><ContentPlanBoard /></Wrapper> : null}
      {isPresentationBoard ? <Wrapper as="section" marginTop="lg"><PresentationContentTab /></Wrapper> : null}
      {isProductLibraryBoard ? <Wrapper as="section" marginTop="lg"><ProductLibraryBoard /></Wrapper> : null}
      {isVideoScriptsBoard ? <Wrapper as="section" marginTop="lg"><VideoScriptsBoard /></Wrapper> : null}
      {isAgentTasksBoard ? <Wrapper as="section" marginTop="lg"><AgentKnowledgeTemplate /></Wrapper> : null}
      {isAgentDatasetBoard ? <Wrapper as="section" marginTop="lg"><AgentTrainingDataset /></Wrapper> : null}
      {isAgentFaqBoard ? <Wrapper as="section" marginTop="lg"><AgentFaqTemplate /></Wrapper> : null}
      {isCeoPresentationBoard ? <Wrapper as="section" marginTop="lg"><AtlasPresentationBoard /></Wrapper> : null}
      {isWhitePaperBoard ? <Wrapper as="section" marginTop="lg"><WhitePaperBoard /></Wrapper> : null}
      {isLegalDocsBoard ? <Wrapper as="section" marginTop="lg"><LegalDocumentsBoard /></Wrapper> : null}
      {isTerminologyBoard ? <Wrapper as="section" marginTop="lg"><AgentTerminologyTemplate /></Wrapper> : null}
      {isSecurityReviewBoard ? <Wrapper as="section" marginTop="lg"><SecurityReviewBoard /></Wrapper> : null}
      {isTransportRiskFaqBoard ? <Wrapper as="section" marginTop="lg"><TransportRiskFaqBoard /></Wrapper> : null}
      {isDailyTasksBoard ? <Wrapper as="section" marginTop="lg"><DailyTasksBoard /></Wrapper> : null}

      {!isStaticContentBoard ? (
        <>
      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-launch-progress">
        <LayoutGrid columns="three" gap="md">
          <LayoutCell>
            <div className="analytics-launch-stat">
              <span>Всего задач</span>
              <strong>{visibleTasks.length}</strong>
            </div>
          </LayoutCell>
          <LayoutCell>
            <div className="analytics-launch-stat">
              <span>Выполнено</span>
              <strong>{completedCount}</strong>
            </div>
          </LayoutCell>
          <LayoutCell>
            <div className="analytics-launch-stat">
              <span>Осталось</span>
              <strong>{visibleTasks.length - completedCount}</strong>
            </div>
          </LayoutCell>
        </LayoutGrid>
        <Wrapper marginTop="md">
          <LaunchProgressBar value={progress} />
        </Wrapper>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-task-control-panel">
        <div className="analytics-task-control-grid">
          <div className="analytics-task-signal is-danger">
            <span>Просрочено</span>
            <strong>{activeTimingStats.overdue}</strong>
          </div>
          <div className="analytics-task-signal is-accent">
            <span>Сегодня</span>
            <strong>{activeTimingStats.today}</strong>
          </div>
          <div className="analytics-task-signal is-success">
            <span>7 дней</span>
            <strong>{activeTimingStats.week}</strong>
          </div>
          <div className="analytics-task-signal is-focus">
            <span>Фокус</span>
            <strong>{activeTimingStats.focus}</strong>
          </div>
          <label className="analytics-task-assignee-filter">
            <span>Исполнитель</span>
            <select
              className="analytics-launch-input"
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
            >
              <option value="">Все</option>
              <option value="Не назначен">Не назначен</option>
              {activeAssignees.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </label>
        </div>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-launch-form">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Добавить задачу</span>
            <h3 className="analytics-section-title">{isTaskCategoryBoard ? `Новая задача: ${activeTaskCategoryBoard.label}` : isMarketingBoard ? "Новая маркетинговая задача" : isIdeasBoard ? "Новая идея" : isKnowledgeBaseBoard ? "Новая задача базы знаний" : "Новая задача"}</h3>
            <p className="analytics-page-subtitle">
              Заполни минимум название. Остальные поля можно поправить прямо в таблице.
            </p>
          </div>
        </div>
        <div className="analytics-launch-form-grid">
          <label>
            <span>Название</span>
            <input
              className="analytics-launch-input"
              value={newTask.title}
              onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
              placeholder={isTaskCategoryBoard ? "Например: подготовить задачу и потом распределить" : isMarketingBoard ? "Например: парсер Telegram" : isIdeasBoard ? "Например: AMA-сессия" : isKnowledgeBaseBoard ? "Например: FAQ" : "Например: наполнить базу знаний"}
            />
          </label>
          <label>
            <span>Направление</span>
            <input
              className="analytics-launch-input"
              value={newTask.responsible}
              onChange={(event) => setNewTask((current) => ({ ...current, responsible: event.target.value }))}
              placeholder={isTaskCategoryBoard ? activeTaskCategoryBoard.defaultResponsible : isMarketingBoard ? "Маркетинг / парсеры" : isIdeasBoard ? "Маркетинг / продукт" : isKnowledgeBaseBoard ? "Контент / продукт" : "Backend / продукт / DevOps"}
            />
          </label>
          <label>
            <span>Исполнитель</span>
            <select
              className="analytics-launch-input"
              value={newTask.assignee}
              onChange={(event) => setNewTask((current) => ({ ...current, assignee: event.target.value }))}
            >
              {TASK_ASSIGNEES.map((assignee) => (
                <option key={assignee || "empty"} value={assignee}>
                  {assignee || "Не назначен"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Дата</span>
            <input
              className="analytics-launch-input"
              value={newTask.dueDate}
              onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
              placeholder="25.05.2026"
            />
          </label>
          <label>
            <span>Приоритет</span>
            <select
              className="analytics-launch-input"
              value={newTask.priority}
              onChange={(event) => setNewTask((current) => ({ ...current, priority: event.target.value }))}
            >
              {LAUNCH_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select
              className="analytics-launch-input"
              value={newTask.status}
              onChange={(event) => setNewTask((current) => ({ ...current, status: event.target.value }))}
            >
              {LAUNCH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="analytics-launch-form-comment">
            <span>Комментарий</span>
            <textarea
              className="analytics-launch-input"
              rows="2"
              value={newTask.comment}
              onChange={(event) => setNewTask((current) => ({ ...current, comment: event.target.value }))}
              placeholder="Что должно быть внутри задачи, какие вкладки, данные или проверки"
            />
          </label>
          <AnalyticsActionButton variant="primary" onClick={addTask} disabled={!newTask.title.trim()}>
            Добавить задачу
          </AnalyticsActionButton>
        </div>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-surface analytics-launch-checklist">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Задачи</span>
            <h3 className="analytics-section-title">{boardTitle}</h3>
            <p className="analytics-page-subtitle">
              {boardSubtitle}. Меняй название, направление, исполнителя, комментарий, дату, приоритет и статус прямо здесь. Готовые задачи зачёркиваются.
            </p>
          </div>
        </div>

        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-launch-table">
            <thead>
              <tr>
                <th>Готово</th>
                <th>Название</th>
                <th>Направление</th>
                <th>Исполнитель</th>
                <th>Комментарий</th>
                <th>Дата</th>
                <th>Приоритет</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisibleTasks.map((task) => {
                const completed = task.done || task.status === "Готово";
                const statusTone = getLaunchStatusTone(task.status);
                const priority = task.priority || "Средний";
                const priorityTone = getLaunchPriorityTone(priority);
                const timing = getTaskTiming(task);

                return (
                  <tr key={task.id} className={`${completed ? "analytics-launch-task-done" : ""} analytics-launch-task-${timing}${task.focus ? " analytics-launch-task-focus" : ""}`.trim()}>
                    <td>
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={(event) => updateTask(task.id, { done: event.target.checked })}
                        aria-label={`Отметить задачу ${task.title}`}
                        className="analytics-launch-checkbox"
                      />
                    </td>
                    <td>
                      <LaunchEditableCell activeBoard={activeBoard} task={task} field="title" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} variant="title" />
                    </td>
                    <td><LaunchEditableCell activeBoard={activeBoard} task={task} field="responsible" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} /></td>
                    <td><LaunchEditableCell activeBoard={activeBoard} task={task} field="assignee" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} variant="assignee" selectOptions={TASK_ASSIGNEES} /></td>
                    <td className="analytics-launch-comment"><LaunchEditableCell activeBoard={activeBoard} task={task} field="comment" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} multiline rows={5} /></td>
                    <td><LaunchEditableCell activeBoard={activeBoard} task={task} field="dueDate" editingCell={editingCell} setEditingCell={setEditingCell} updateTask={updateTask} variant="date" /></td>
                    <td>
                      <select
                        className={`analytics-launch-priority-select analytics-launch-priority-${priorityTone}`}
                        value={priority}
                        onChange={(event) => updateTask(task.id, { priority: event.target.value })}
                      >
                        {LAUNCH_PRIORITIES.map((priorityOption) => (
                          <option key={priorityOption} value={priorityOption}>
                            {priorityOption}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={`analytics-launch-status-select analytics-launch-status-${statusTone}`}
                        value={task.status}
                        onChange={(event) => updateTask(task.id, { status: event.target.value, done: event.target.value === "Готово" })}
                      >
                        {LAUNCH_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="analytics-launch-actions">
                        <AnalyticsActionButton
                          variant={task.focus ? "primary" : "secondary"}
                          size="icon"
                          onClick={() => updateTask(task.id, { focus: !task.focus })}
                          title={task.focus ? "Убрать из фокуса" : "В фокус недели"}
                          aria-label={`${task.focus ? "Убрать из фокуса" : "Добавить в фокус"} задачу ${task.title}`}
                        >
                          ★
                        </AnalyticsActionButton>
                        <AnalyticsActionButton
                          variant="success"
                          size="icon"
                          onClick={() => updateTask(task.id, { status: "Готово", done: true })}
                          title="Готово"
                          aria-label={`Отметить задачу ${task.title} готовой`}
                        >
                          ✓
                        </AnalyticsActionButton>
                        <AnalyticsActionButton
                          variant="warning"
                          size="icon"
                          onClick={() => updateTask(task.id, { status: "Отложено", done: false })}
                          title="Отложить"
                          aria-label={`Отложить задачу ${task.title}`}
                        >
                          ⏸
                        </AnalyticsActionButton>
                        <AnalyticsActionButton
                          variant="danger"
                          size="icon"
                          onClick={() => removeTask(task.id)}
                          title="В архив"
                          aria-label={`Перенести задачу ${task.title} в архив`}
                        >
                          ×
                        </AnalyticsActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredVisibleTasks.length ? (
                <tr>
                  <td colSpan="9">
                    <div className="analytics-task-empty-row">По текущему фильтру задач нет.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </div>
      </Wrapper>

      <Wrapper as="section" marginTop="lg">
        <div className="analytics-task-lower-grid">
        <article className="analytics-surface analytics-task-history-card">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">История изменений</span>
              <h3 className="analytics-section-title">Последние действия</h3>
            </div>
          </div>
          <div className="analytics-task-history-list">
            {boardHistory.map((item) => (
              <div key={item.id} className="analytics-task-history-row">
                <span>{formatHistoryDate(item.createdAt)}</span>
                <strong>{item.action}</strong>
                <p>{item.taskTitle}</p>
                {item.details ? <small>{item.details}</small> : null}
              </div>
            ))}
            {!boardHistory.length ? <div className="analytics-crm-my-tasks-empty">История появится после изменений статусов, исполнителей и архива.</div> : null}
          </div>
        </article>

        <article className="analytics-surface analytics-task-history-card">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">Архив</span>
              <h3 className="analytics-section-title">Можно восстановить</h3>
            </div>
          </div>
          <div className="analytics-task-history-list">
            {boardArchive.map((item) => (
              <div key={item.archiveId} className="analytics-task-history-row analytics-task-archive-row">
                <span>{formatHistoryDate(item.archivedAt)}</span>
                <strong>{item.title}</strong>
                <p>{item.assignee || "Не назначен"} · {item.status || "В работе"}</p>
                <button type="button" onClick={() => restoreArchivedTask(item.archiveId)}>
                  Вернуть
                </button>
              </div>
            ))}
            {!boardArchive.length ? <div className="analytics-crm-my-tasks-empty">Архив пуст. Удалённые задачи будут попадать сюда.</div> : null}
          </div>
        </article>
        </div>
      </Wrapper>
        </>
      ) : null}
    </>
  );
}

export default LaunchChecklistSection;
