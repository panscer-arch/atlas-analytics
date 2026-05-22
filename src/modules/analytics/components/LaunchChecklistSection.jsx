import { useEffect, useRef, useState } from "react";
import AgentFaqTemplate from "./AgentFaqTemplate";
import AgentKnowledgeTemplate from "./AgentKnowledgeTemplate";
import AgentTerminologyTemplate from "./AgentTerminologyTemplate";
import AnalyticsActionButton from "./AnalyticsActionButton";
import AtlasPresentationBoard from "./AtlasPresentationBoard";
import LaunchProgressBar from "./LaunchProgressBar";
import MaterialsLinksBoard from "./MaterialsLinksBoard";
import VideoScriptsBoard from "./VideoScriptsBoard";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const LAUNCH_CHECKLIST_STORAGE_KEY = "atlas.analytics.launchChecklist.tasks.v3";
export const KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY = "atlas.analytics.knowledgeBaseChecklist.tasks.v1";
export const IDEAS_CHECKLIST_STORAGE_KEY = "atlas.analytics.ideasChecklist.tasks.v1";
export const MARKETING_CHECKLIST_STORAGE_KEY = "atlas.analytics.marketingChecklist.tasks.v1";
export const DAILY_TASKS_STORAGE_KEY = "atlas.analytics.dailyTasks.2026-05-22.v1";
export const TASK_ARCHIVE_STORAGE_KEY = "atlas.analytics.taskArchive.v1";
export const TASK_HISTORY_STORAGE_KEY = "atlas.analytics.taskHistory.v1";
const CUSTOM_CHECKLISTS_STORAGE_KEY = "atlas.analytics.customChecklists.v1";
const LAUNCH_STATUSES = ["В работе", "Не в работе", "Готово", "Отложено"];
const LAUNCH_PRIORITIES = ["Срочно", "Высокий", "Средний", "Низкий"];
const TASK_ASSIGNEES = ["", "Bruno", "Digitex", "Gem", "Rotenberg"];
const DEFAULT_BOARD_ID = "launch";
const STATIC_BOARD_IDS = ["launch", "knowledgeBase", "ideas", "dailyTasks", "videoScripts", "materials", "agentTasks", "agentFaq", "ceoPresentation", "terminology", "marketing"];
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
  materials: {
    title: "Материалы",
    description: "Быстрый вход в Google Docs и рабочие документы команды по всем направлениям.",
  },
  agentTasks: {
    title: "Параметры",
    description: "Параметры и факты проекта для AI-агента: Web3, циклы, партнерка, DAO, риски и ссылки.",
  },
  agentFaq: {
    title: "FAQ",
    description: "Готовая база вопросов участников по регистрации, кошельку, тарифам, Claim, безопасности и поддержке.",
  },
  ceoPresentation: {
    title: "CEO-презентация",
    description: "Согласованные 9 слайдов: визуальное ТЗ и текст Архитектора для production-ролика.",
  },
  terminology: {
    title: "Терминология",
    description: "Глоссарий Atlas System: термины, понятные описания, категории и комментарии для вычитки.",
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

const defaultDailyTasks = [
  {
    id: "daily-2026-05-22-prototype",
    title: "Утвердить прототип заглушки atlas-system.io",
    priority: "Срочно",
    duration: "22 мая, до 12:00",
    deadline: "22.05.2026 12:00",
    responsible: "Digitex / UI-designer / Product-manager",
    description: "Посмотреть 3-screen prototype: 1 экран Architect video + coming soon, 2 экран краткое описание Atlas + CTA, 3 экран соцсети и контакты команды. Зафиксировать, что берём в дизайн.",
    materials: "https://analytics.pupanel.cc/atlas-site-concept/prototype-v2.html",
    status: "В работе",
    messages: [
      {
        id: "msg-daily-prototype-1",
        author: "Codex",
        text: "Фокус: не распыляться на весь сайт. Сначала утверждаем композицию первых 3 экранов.",
        createdAt: "2026-05-21T20:30:00.000Z",
      },
    ],
  },
  {
    id: "daily-2026-05-22-copy",
    title: "Собрать короткий английский текст для первых 3 экранов",
    priority: "Высокий",
    duration: "22 мая, до 15:00",
    deadline: "22.05.2026 15:00",
    responsible: "Copywriter / Content architect",
    description: "Нужны короткие блоки: Architect intro, Community idea, Ecosystem summary. Без обещаний гарантированного дохода и без агрессивного MLM.",
    materials: "ТЗ в карточке “Заглушка на сайт → Дизайн hero и визуальная система”.",
    status: "В работе",
    messages: [],
  },
  {
    id: "daily-2026-05-22-assets",
    title: "Подготовить финальные контакты и медиа для заглушки",
    priority: "Высокий",
    duration: "22 мая, до 17:00",
    deadline: "22.05.2026 17:00",
    responsible: "Content ops / Assets",
    description: "Дать Telegram-ссылки помощников, финальный логотип, ссылку на YouTube-ролик Архитектора или финальный placeholder до публикации.",
    materials: "Telegram, WhatsApp, Email. Домен: atlas-system.io. English only.",
    status: "Не в работе",
    messages: [],
  },
  {
    id: "daily-2026-05-22-front",
    title: "Собрать рабочий HTML-прототип после утверждения дизайна",
    priority: "Средний",
    duration: "22 мая, после утверждения первых экранов",
    deadline: "22.05.2026 20:00",
    responsible: "Frontend-developer / QA",
    description: "После утверждения направления собрать первый рабочий вариант страницы, проверить desktop/mobile, CTA, ссылки, читаемость и отсутствие визуального мусора.",
    materials: "/atlas-site-concept/prototype-v2.html и /atlas-site-preview/index.html",
    status: "Не в работе",
    messages: [],
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

function normalizeDailyTasks(tasks) {
  return normalizeArray(tasks).map((task) => ({
    id: task.id || `daily-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: task.title || "",
    priority: task.priority || "Средний",
    duration: task.duration || "",
    deadline: task.deadline || "",
    responsible: task.responsible || "",
    description: task.description || "",
    materials: task.materials || "",
    status: task.status || "Не в работе",
    completedAt: task.completedAt || "",
    updatedAt: task.updatedAt || "",
    subtasks: normalizeArray(task.subtasks).map((subtask) => ({
      id: subtask.id || `daily-subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: subtask.title || "",
      done: Boolean(subtask.done),
    })),
    messages: normalizeArray(task.messages),
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

function readStoredDailyTasks() {
  if (typeof window === "undefined") return normalizeDailyTasks(defaultDailyTasks);

  try {
    const saved = window.localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    return normalizeDailyTasks(saved ? JSON.parse(saved) : defaultDailyTasks);
  } catch {
    return normalizeDailyTasks(defaultDailyTasks);
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

function createDailyTask(overrides = {}) {
  return {
    id: `daily-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    priority: "Средний",
    duration: "22 мая",
    deadline: "22.05.2026",
    responsible: "",
    description: "",
    materials: "",
    status: "Не в работе",
    subtasks: [],
    messages: [],
    ...overrides,
  };
}

function createDailySubtask(title = "") {
  return {
    id: `daily-subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    done: false,
  };
}

function formatDailyMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parseDailyDeadline(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const ruMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (ruMatch) {
    const date = new Date(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getDailyDeadlineMeta(deadline) {
  const date = parseDailyDeadline(deadline);
  if (!date) return { label: "Без даты", tone: "idle" };

  const today = getStartOfDay();
  const deadlineDay = getStartOfDay(date);
  const diffDays = Math.ceil((deadlineDay.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: `Просрочено ${Math.abs(diffDays)} дн.`, tone: "danger" };
  if (diffDays === 0) return { label: "Сегодня дедлайн", tone: "urgent" };
  if (diffDays === 1) return { label: "Остался 1 день", tone: "accent" };
  return { label: `Осталось ${diffDays} дн.`, tone: diffDays <= 3 ? "accent" : "safe" };
}

function buildDailyShareText(tasks) {
  const activeTasks = normalizeArray(tasks).filter((task) => task.status !== "Готово");

  return [
    "Задачи на 22 мая",
    "",
    ...activeTasks.map((task, index) => [
      `${index + 1}. ${task.title || "Без названия"}`,
      `Статус: ${task.status || "Не в работе"}`,
      `Приоритет: ${task.priority || "Средний"}`,
      `Срок выполнения: ${task.duration || "—"}`,
      `Дедлайн: ${task.deadline || "—"}`,
      `Ответственный: ${task.responsible || "Не назначен"}`,
      `Материалы: ${task.materials || "—"}`,
      task.description ? `Описание: ${task.description}` : "",
      normalizeArray(task.subtasks).length
        ? `Подзадачи:\n${normalizeArray(task.subtasks).map((subtask) => `- ${subtask.done ? "[x]" : "[ ]"} ${subtask.title || "Без названия"}`).join("\n")}`
        : "",
    ].filter(Boolean).join("\n")),
  ].join("\n\n");
}

function DailyTasksBoard() {
  const [tasks, setTasks] = useState(readStoredDailyTasks);
  const [draft, setDraft] = useState(() => createDailyTask({ status: "В работе" }));
  const [chatDrafts, setChatDrafts] = useState({});
  const [subtaskDrafts, setSubtaskDrafts] = useState({});
  const [copyState, setCopyState] = useState("Скопировать карточку");
  const [saveState, setSaveState] = useState("Сохранено");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const saveRequestRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    loadServerContent(DAILY_TASKS_STORAGE_KEY).then((savedTasks) => {
      if (!isMounted || !Array.isArray(savedTasks)) return;

      const normalizedTasks = normalizeDailyTasks(savedTasks);
      setTasks(normalizedTasks);
      try {
        window.localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(normalizedTasks));
      } catch {
        // Серверная версия всё равно уже загружена в состояние страницы.
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function persistDailyTasks(nextTasks) {
    const normalizedTasks = normalizeDailyTasks(nextTasks);
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    setSaveState("Сохраняю...");

    try {
      window.localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(normalizedTasks));
    } catch {
      // Дневная доска продолжит работать в состоянии страницы.
    }

    saveServerContent(DAILY_TASKS_STORAGE_KEY, normalizedTasks).then((ok) => {
      if (saveRequestRef.current !== requestId) return;
      setSaveState(ok ? "Сохранено на сервере" : "Ошибка сохранения");
    });
  }

  function persist(updater) {
    setTasks((currentTasks) => {
      const nextTasks = typeof updater === "function" ? updater(currentTasks) : updater;
      persistDailyTasks(nextTasks);
      return normalizeDailyTasks(nextTasks);
    });
  }

  function patchTask(taskId, patch) {
    persist((currentTasks) => currentTasks.map((task) => {
      if (task.id !== taskId) return task;
      const nextStatus = patch.status ?? task.status;

      return {
        ...task,
        ...patch,
        completedAt: nextStatus === "Готово" ? (task.completedAt || new Date().toISOString()) : "",
        updatedAt: new Date().toISOString(),
      };
    }));
  }

  function addTask() {
    if (!draft.title.trim()) return;
    persist((currentTasks) => [createDailyTask({ ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() }), ...currentTasks]);
    setDraft(createDailyTask({ status: "В работе" }));
    setIsAddTaskOpen(false);
  }

  function archiveTask(taskId) {
    patchTask(taskId, { status: "Готово", completedAt: new Date().toISOString() });
  }

  function restoreTask(taskId) {
    patchTask(taskId, { status: "В работе", completedAt: "" });
  }

  function addMessage(taskId) {
    const value = (chatDrafts[taskId] || "").trim();
    if (!value) return;

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      author: "Команда",
      text: value,
      createdAt: new Date().toISOString(),
    };

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId ? { ...task, messages: [...normalizeArray(task.messages), message], updatedAt: new Date().toISOString() } : task
    )));
    setChatDrafts((current) => ({ ...current, [taskId]: "" }));
  }

  function addSubtask(taskId) {
    const title = (subtaskDrafts[taskId] || "").trim();
    if (!title) return;

    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? { ...task, subtasks: [...normalizeArray(task.subtasks), createDailySubtask(title)], updatedAt: new Date().toISOString() }
        : task
    )));
    setSubtaskDrafts((current) => ({ ...current, [taskId]: "" }));
  }

  function updateSubtask(taskId, subtaskId, patch) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          subtasks: normalizeArray(task.subtasks).map((subtask) => (subtask.id === subtaskId ? { ...subtask, ...patch } : subtask)),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
  }

  function removeSubtask(taskId, subtaskId) {
    persist((currentTasks) => currentTasks.map((task) => (
      task.id === taskId
        ? {
          ...task,
          subtasks: normalizeArray(task.subtasks).filter((subtask) => subtask.id !== subtaskId),
          updatedAt: new Date().toISOString(),
        }
        : task
    )));
  }

  async function copyShareCard() {
    const text = buildDailyShareText(tasks);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("Скопировано");
      window.setTimeout(() => setCopyState("Скопировать карточку"), 1600);
    } catch {
      setCopyState("Не скопировалось");
      window.setTimeout(() => setCopyState("Скопировать карточку"), 1600);
    }
  }

  const completedTasks = tasks.filter((task) => task.status === "Готово");
  const activeTasks = tasks.filter((task) => task.status !== "Готово");
  const doneCount = completedTasks.length;

  function renderDailyTaskCard(task, index, isCompleted = false) {
    const priorityTone = getLaunchPriorityTone(task.priority);
    const statusTone = getLaunchStatusTone(task.status);
    const subtasks = normalizeArray(task.subtasks);
    const completedSubtasks = subtasks.filter((subtask) => subtask.done).length;
    const deadlineMeta = getDailyDeadlineMeta(task.deadline);

    return (
      <article key={task.id} className={`analytics-surface analytics-daily-card${isCompleted ? " analytics-daily-card-done" : ""}`}>
        <div className="analytics-daily-card-head">
          <div>
            <span className="analytics-daily-number">{isCompleted ? "Выполнено" : `Задача ${index + 1}`}</span>
            <input className="analytics-daily-title" value={task.title} onChange={(event) => patchTask(task.id, { title: event.target.value })} />
          </div>
          <div className="analytics-daily-card-actions">
            <span className={`analytics-daily-deadline analytics-daily-deadline-${deadlineMeta.tone}`}>{deadlineMeta.label}</span>
            <button type="button" className="analytics-daily-remove" onClick={() => (isCompleted ? restoreTask(task.id) : archiveTask(task.id))}>
              {isCompleted ? "Вернуть" : "Готово"}
            </button>
          </div>
        </div>

        <div className="analytics-daily-fields">
          <label>
            <span>Приоритет</span>
            <select className={`form-select analytics-launch-priority-select analytics-launch-priority-${priorityTone}`} value={task.priority} onChange={(event) => patchTask(task.id, { priority: event.target.value })}>
              {LAUNCH_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select className={`form-select analytics-launch-status-select analytics-launch-status-${statusTone}`} value={task.status} onChange={(event) => patchTask(task.id, { status: event.target.value })}>
              {LAUNCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span>Срок выполнения</span>
            <input className="form-control analytics-launch-input" value={task.duration} onChange={(event) => patchTask(task.id, { duration: event.target.value })} />
          </label>
          <label>
            <span>Дата дедлайна</span>
            <input className="form-control analytics-launch-input" value={task.deadline} onChange={(event) => patchTask(task.id, { deadline: event.target.value })} />
          </label>
          <label>
            <span>Кто</span>
            <input className="form-control analytics-launch-input" value={task.responsible} onChange={(event) => patchTask(task.id, { responsible: event.target.value })} />
          </label>
        </div>

        <div className="analytics-daily-subtasks">
          <div className="analytics-daily-subtasks-head">
            <span>Подзадачи</span>
            <small>{completedSubtasks}/{subtasks.length}</small>
          </div>
          <div className="analytics-daily-subtasks-list">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className={`analytics-daily-subtask${subtask.done ? " is-done" : ""}`}>
                <input
                  type="checkbox"
                  checked={Boolean(subtask.done)}
                  onChange={(event) => updateSubtask(task.id, subtask.id, { done: event.target.checked })}
                  aria-label="Отметить подзадачу"
                />
                <input
                  className="form-control analytics-launch-input"
                  value={subtask.title}
                  onChange={(event) => updateSubtask(task.id, subtask.id, { title: event.target.value })}
                  placeholder="Название подзадачи"
                />
                <button type="button" onClick={() => removeSubtask(task.id, subtask.id)} aria-label="Удалить подзадачу">×</button>
              </div>
            ))}
            {!subtasks.length ? <div className="analytics-daily-chat-empty">Разбей большую задачу на конкретные шаги.</div> : null}
          </div>
          <div className="analytics-daily-subtask-add">
            <input
              className="form-control analytics-launch-input"
              value={subtaskDrafts[task.id] || ""}
              onChange={(event) => setSubtaskDrafts((current) => ({ ...current, [task.id]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") addSubtask(task.id);
              }}
              placeholder="Например: настроить парсер, добавить сотрудника, написать письма"
            />
            <AnalyticsActionButton variant="primary" onClick={() => addSubtask(task.id)} disabled={!(subtaskDrafts[task.id] || "").trim()}>Добавить</AnalyticsActionButton>
          </div>
        </div>

        <div className="analytics-daily-details">
          <label>
            <span>Доп. описание</span>
            <textarea className="form-control analytics-launch-input" rows="3" value={task.description} onChange={(event) => patchTask(task.id, { description: event.target.value })} />
          </label>
          <label>
            <span>Доп. материалы / ссылки</span>
            <textarea className="form-control analytics-launch-input" rows="3" value={task.materials} onChange={(event) => patchTask(task.id, { materials: event.target.value })} />
          </label>
        </div>

        <div className="analytics-daily-chat">
          <div className="analytics-daily-chat-title">Чат по задаче</div>
          <div className="analytics-daily-chat-list">
            {normalizeArray(task.messages).map((message) => (
              <div key={message.id} className="analytics-daily-message">
                <div><strong>{message.author || "Команда"}</strong><span>{formatDailyMessageTime(message.createdAt)}</span></div>
                <p>{message.text}</p>
              </div>
            ))}
            {!normalizeArray(task.messages).length ? <div className="analytics-daily-chat-empty">История переписки пока пустая.</div> : null}
          </div>
          <div className="analytics-daily-chat-form">
            <input
              className="form-control analytics-launch-input"
              value={chatDrafts[task.id] || ""}
              onChange={(event) => setChatDrafts((current) => ({ ...current, [task.id]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") addMessage(task.id);
              }}
              placeholder="Написать сообщение по этой задаче"
            />
            <AnalyticsActionButton variant="primary" onClick={() => addMessage(task.id)} disabled={!(chatDrafts[task.id] || "").trim()}>Отправить</AnalyticsActionButton>
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <section className="analytics-surface analytics-daily-hero mt-4">
        <div>
          <span className="analytics-kicker">Фокус на день</span>
          <h3 className="analytics-section-title">Задачи на 22 мая</h3>
          <p className="analytics-page-subtitle mb-0">
            Одна рабочая карточка для команды: приоритеты, сроки, ответственные, материалы и чат по каждой задаче. Всё сохраняется на сервере.
          </p>
        </div>
        <div className="analytics-daily-summary">
          <div><span>Всего</span><strong>{tasks.length}</strong></div>
          <div><span>Готово</span><strong>{doneCount}</strong></div>
          <div><span>В работе</span><strong>{activeTasks.length}</strong></div>
          <AnalyticsActionButton variant="primary" onClick={() => setIsAddTaskOpen((current) => !current)}>
            {isAddTaskOpen ? "Скрыть форму" : "Добавить задачу"}
          </AnalyticsActionButton>
          <AnalyticsActionButton variant="primary" onClick={copyShareCard}>{copyState}</AnalyticsActionButton>
        </div>
        <div className={`analytics-daily-save analytics-daily-save-${saveState === "Ошибка сохранения" ? "error" : "ok"}`}>{saveState}</div>
      </section>

      {isAddTaskOpen ? (
        <section className="analytics-surface analytics-daily-add mt-4">
          <div className="analytics-data-table-head">
            <div>
              <span className="analytics-kicker">Добавить на 22 мая</span>
              <h3 className="analytics-section-title">Новая дневная задача</h3>
            </div>
            <AnalyticsActionButton variant="secondary" onClick={() => setIsAddTaskOpen(false)}>Свернуть</AnalyticsActionButton>
          </div>
          <div className="analytics-daily-form">
            <label>
              <span>Название задачи</span>
              <input className="form-control analytics-launch-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Например: согласовать первый экран сайта" />
            </label>
            <label>
              <span>Приоритет</span>
              <select className="form-select analytics-launch-input" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
                {LAUNCH_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label>
              <span>Срок выполнения</span>
              <input className="form-control analytics-launch-input" value={draft.duration} onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value }))} placeholder="22 мая, до 15:00" />
            </label>
            <label>
              <span>Дата дедлайна</span>
              <input className="form-control analytics-launch-input" value={draft.deadline} onChange={(event) => setDraft((current) => ({ ...current, deadline: event.target.value }))} placeholder="22.05.2026 15:00" />
            </label>
            <label>
              <span>Ответственный</span>
              <input className="form-control analytics-launch-input" value={draft.responsible} onChange={(event) => setDraft((current) => ({ ...current, responsible: event.target.value }))} placeholder="Имя или роль" />
            </label>
            <label>
              <span>Статус</span>
              <select className="form-select analytics-launch-input" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
                {LAUNCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="analytics-daily-form-wide">
              <span>Доп. описание</span>
              <textarea className="form-control analytics-launch-input" rows="2" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Что конкретно нужно сделать" />
            </label>
            <label className="analytics-daily-form-wide">
              <span>Доп. материалы / ссылки</span>
              <textarea className="form-control analytics-launch-input" rows="2" value={draft.materials} onChange={(event) => setDraft((current) => ({ ...current, materials: event.target.value }))} placeholder="Ссылки, документы, прототипы" />
            </label>
            <AnalyticsActionButton variant="primary" onClick={addTask} disabled={!draft.title.trim()}>Добавить</AnalyticsActionButton>
          </div>
        </section>
      ) : null}

      <div className="analytics-daily-section-head mt-4">
        <span className="analytics-kicker">Активные задачи</span>
        <strong>{activeTasks.length}</strong>
      </div>
      <section className="analytics-daily-grid mt-3">
        {activeTasks.map((task, index) => renderDailyTaskCard(task, index))}
      </section>

      {completedTasks.length ? (
        <>
          <div className="analytics-daily-section-head analytics-daily-archive-head mt-4">
            <span className="analytics-kicker">Архив дня / выполнено</span>
            <strong>{completedTasks.length}</strong>
          </div>
          <section className="analytics-daily-grid analytics-daily-archive-grid mt-3">
            {completedTasks.map((task, index) => renderDailyTaskCard(task, index, true))}
          </section>
        </>
      ) : null}
    </>
  );
}

function LaunchChecklistSection({ mode = "tasks" }) {
  const [activeBoard, setActiveBoard] = useState(() => {
    const fallbackBoard = mode === "content" ? "materials" : DEFAULT_BOARD_ID;
    if (typeof window === "undefined") return fallbackBoard;

    const url = new URL(window.location.href);
    return url.searchParams.get("board") || fallbackBoard;
  });
  const [launchTasks, setLaunchTasks] = useState(() => readStoredTasks(LAUNCH_CHECKLIST_STORAGE_KEY, defaultLaunchChecklistTasks));
  const [knowledgeBaseTasks, setKnowledgeBaseTasks] = useState(() => readStoredTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, defaultKnowledgeBaseChecklistTasks));
  const [ideaTasks, setIdeaTasks] = useState(() => readStoredTasks(IDEAS_CHECKLIST_STORAGE_KEY, defaultIdeasChecklistTasks));
  const [marketingTasks, setMarketingTasks] = useState(() => readStoredTasks(MARKETING_CHECKLIST_STORAGE_KEY, defaultMarketingChecklistTasks));
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
  const isVideoScriptsBoard = activeBoard === "videoScripts";
  const isMaterialsBoard = activeBoard === "materials";
  const isAgentTasksBoard = activeBoard === "agentTasks";
  const isAgentFaqBoard = activeBoard === "agentFaq";
  const isCeoPresentationBoard = activeBoard === "ceoPresentation";
  const isTerminologyBoard = activeBoard === "terminology";
  const isMarketingBoard = activeBoard === "marketing";
  const isStaticContentBoard = isDailyTasksBoard || isVideoScriptsBoard || isMaterialsBoard || isAgentTasksBoard || isAgentFaqBoard || isCeoPresentationBoard || isTerminologyBoard;
  const activeCustomChecklist = customChecklists.find((checklist) => checklist.id === activeBoard);
  const isCustomBoard = Boolean(activeCustomChecklist);
  const visibleTasks = isStaticContentBoard ? [] : isCustomBoard ? activeCustomChecklist.tasks : isMarketingBoard ? marketingTasks : isIdeasBoard ? ideaTasks : isKnowledgeBaseBoard ? knowledgeBaseTasks : launchTasks;
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
  const boardTitle = isCustomBoard ? activeCustomChecklist.title : isDailyTasksBoard ? "Задачи на день" : isMarketingBoard ? "Задачи маркетинга" : isIdeasBoard ? "Идеи" : isKnowledgeBaseBoard ? "Задачи базы знаний" : "Задачи запуска";
  const boardSubtitle = isCustomBoard
    ? "Пользовательский чек-лист с собственным набором задач."
    : isDailyTasksBoard
      ? "Карточки фокуса на 22 мая: дедлайны, ответственные, материалы и чат по каждой задаче."
    : isIdeasBoard
      ? "Сырые идеи разложены по направлениям, чтобы их можно было приоритизировать и превращать в задачи."
    : isVideoScriptsBoard
      ? "Сценарии и ТЗ для роликов: можно читать, редактировать текущие тексты и добавлять новые ролики."
    : isMaterialsBoard
      ? "Карта Google Docs и Drive-ссылок по разделам: ТЗ, кабинет, ролики, документы, исследования и маркетинг."
    : isAgentTasksBoard
      ? "Editable-документ параметров для обучения AI-агента Atlas System."
    : isAgentFaqBoard
      ? "Editable FAQ по вопросам участников и ответам AI-агента."
    : isCeoPresentationBoard
      ? "Согласованные слайды CEO-презентации: визуальное ТЗ и текст Архитектора."
    : isTerminologyBoard
      ? "Editable-глоссарий терминов Atlas System по категориям: Web3, циклы, партнерка, DAO, юридика и коммуникации."
    : isMarketingBoard
      ? "Маркетинговые задачи с фото: парсеры, рассылки, короткие ролики, почта, адаптация, QA и роли команды."
    : isKnowledgeBaseBoard
      ? "Материалы, которые нужно подготовить и вычитать для базы знаний."
      : "Что нужно закрыть перед стартом";
  const boardDescription = isCustomBoard
    ? `Чек-лист «${activeCustomChecklist.title}»: добавляй задачи, назначай исполнителей и веди статусы.`
    : isDailyTasksBoard
      ? "Здесь можно быстро собрать задачи на день, поделиться ими с ребятами и вести обсуждение отдельно внутри каждой задачи."
    : isIdeasBoard
      ? "Здесь вычитаны и структурированы идеи по контенту, комьюнити, партнерке, лендингам, smart-contract, вебинарам и исследованиям."
    : isVideoScriptsBoard
      ? "Здесь хранятся тексты и ТЗ для роликов: название, формат, длительность, комментарий и полный сценарий, который можно редактировать прямо в аналитике."
    : isMaterialsBoard
      ? "Здесь можно хранить такую же таблицу ссылок, как в Google Sheets: открыл документ, доработал и вернулся в аналитику."
    : isAgentTasksBoard
      ? "Здесь собраны параметры проекта, Web3, циклы, партнерка, DAO, юридика, риски, FAQ и ссылки на источники для AI-агента."
    : isAgentFaqBoard
      ? "Здесь собрана база вопросов участников по категориям: регистрация, кошелек, депозиты, тарифы, Claim, партнерка, безопасность и поддержка."
    : isCeoPresentationBoard
      ? "Здесь сохраняется approved-сценарий CEO-ролика Atlas System: 9 слайдов, отдельно ТЗ для визуала и речь Архитектора."
    : isTerminologyBoard
      ? "Здесь можно вычитывать терминологию Atlas: название термина, понятное описание, комментарий и спорные формулировки по категориям."
    : isMarketingBoard
      ? "Здесь собраны маркетинговые задачи: парсинг YouTube/Telegram/соцсетей, email-рассылки, короткие видео, проверка функционала, AI-сотрудник и роль менеджера."
    : isKnowledgeBaseBoard
      ? "Здесь собраны презентация, FAQ, ролики, White Paper, MLM-материалы, вебинары и инструкции из фото."
      : "Здесь собраны задачи, ответственные, сроки и комментарии по тому, что нужно закрыть перед запуском проекта.";
  const taskBoardTabs = [
    { id: "launch", label: "Задачи запуска" },
    { id: "marketing", label: "Задачи маркетинга" },
    { id: "knowledgeBase", label: "Задачи по базе знаний" },
    { id: "ideas", label: "Идеи" },
    { id: "dailyTasks", label: "Задачи на день" },
  ];
  const contentBoardTabs = [
    { id: "materials", label: "Материалы" },
    { id: "agentTasks", label: "Параметры" },
    { id: "agentFaq", label: "FAQ" },
    { id: "ceoPresentation", label: "CEO-презентация" },
    { id: "videoScripts", label: "Ролики" },
    { id: "terminology", label: "Терминология" },
  ];
  const visibleBoardTabs = mode === "content" ? contentBoardTabs : taskBoardTabs;
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
      responsible: newTask.responsible.trim() || (isMarketingBoard ? "Маркетинг / рост" : isIdeasBoard ? "Идеи / приоритизация" : isKnowledgeBaseBoard ? "Контент / продукт" : "Не назначено"),
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

  function renderEditableCell(task, field, options = {}) {
    const cellKey = `${activeBoard}:${task.id}:${field}`;
    const isEditing = editingCell === cellKey;
    const value = task[field] || "";
    const label = value || "Нажми, чтобы заполнить";
    const inputClassName = `form-control analytics-launch-table-input${options.inputClassName ? ` ${options.inputClassName}` : ""}`;

    if (isEditing) {
      const commonProps = {
        className: inputClassName,
        value,
        autoFocus: true,
        onChange: (event) => updateTask(task.id, { [field]: event.target.value }),
        onBlur: () => setEditingCell(null),
      };

      if (options.selectOptions) {
        return (
          <select
            className={inputClassName}
            value={value}
            autoFocus
            onChange={(event) => updateTask(task.id, { [field]: event.target.value })}
            onBlur={() => setEditingCell(null)}
          >
            {options.selectOptions.map((option) => (
              <option key={option || "empty"} value={option}>
                {option || "Не назначен"}
              </option>
            ))}
          </select>
        );
      }

      if (options.multiline) {
        return <textarea {...commonProps} rows={options.rows || 4} />;
      }

      return (
        <input
          {...commonProps}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <button
        type="button"
        className={`analytics-launch-read-cell${value ? "" : " analytics-launch-read-cell-empty"}${options.readClassName ? ` ${options.readClassName}` : ""}`}
        onClick={() => setEditingCell(cellKey)}
      >
        {label}
      </button>
    );
  }

  return (
    <>
      <section className="analytics-surface analytics-tab-summary analytics-launch-nav mt-4">
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
              {tab.label}
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
              {checklist.title}
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
      </section>

      {isMaterialsBoard ? <MaterialsLinksBoard /> : null}
      {isVideoScriptsBoard ? <VideoScriptsBoard /> : null}
      {isAgentTasksBoard ? <AgentKnowledgeTemplate /> : null}
      {isAgentFaqBoard ? <AgentFaqTemplate /> : null}
      {isCeoPresentationBoard ? <AtlasPresentationBoard /> : null}
      {isTerminologyBoard ? <AgentTerminologyTemplate /> : null}
      {isDailyTasksBoard ? <DailyTasksBoard /> : null}

      {!isStaticContentBoard ? (
        <>
      <section className="analytics-surface analytics-launch-progress mt-4">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="analytics-launch-stat">
              <span>Всего задач</span>
              <strong>{visibleTasks.length}</strong>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="analytics-launch-stat">
              <span>Выполнено</span>
              <strong>{completedCount}</strong>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="analytics-launch-stat">
              <span>Осталось</span>
              <strong>{visibleTasks.length - completedCount}</strong>
            </div>
          </div>
        </div>
        <LaunchProgressBar value={progress} />
      </section>

      <section className="analytics-surface analytics-task-control-panel mt-4">
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
              className="form-select analytics-launch-input"
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
      </section>

      <section className="analytics-surface analytics-launch-form mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Добавить задачу</span>
            <h3 className="analytics-section-title">{isMarketingBoard ? "Новая маркетинговая задача" : isIdeasBoard ? "Новая идея" : isKnowledgeBaseBoard ? "Новая задача базы знаний" : "Новая задача"}</h3>
            <p className="analytics-page-subtitle mb-0">
              Заполни минимум название. Остальные поля можно поправить прямо в таблице.
            </p>
          </div>
        </div>
        <div className="analytics-launch-form-grid">
          <label>
            <span>Название</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.title}
              onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
              placeholder={isMarketingBoard ? "Например: парсер Telegram" : isIdeasBoard ? "Например: AMA-сессия" : isKnowledgeBaseBoard ? "Например: FAQ" : "Например: наполнить базу знаний"}
            />
          </label>
          <label>
            <span>Направление</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.responsible}
              onChange={(event) => setNewTask((current) => ({ ...current, responsible: event.target.value }))}
              placeholder={isMarketingBoard ? "Маркетинг / парсеры" : isIdeasBoard ? "Маркетинг / продукт" : isKnowledgeBaseBoard ? "Контент / продукт" : "Backend / продукт / DevOps"}
            />
          </label>
          <label>
            <span>Исполнитель</span>
            <select
              className="form-select analytics-launch-input"
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
              className="form-control analytics-launch-input"
              value={newTask.dueDate}
              onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
              placeholder="25.05.2026"
            />
          </label>
          <label>
            <span>Приоритет</span>
            <select
              className="form-select analytics-launch-input"
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
              className="form-select analytics-launch-input"
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
              className="form-control analytics-launch-input"
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
      </section>

      <section className="analytics-surface analytics-launch-checklist mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Задачи запуска</span>
            <h3 className="analytics-section-title">{boardTitle}</h3>
            <p className="analytics-page-subtitle mb-0">
              {boardSubtitle}. Меняй название, направление, исполнителя, комментарий, дату, приоритет и статус прямо здесь. Готовые задачи зачёркиваются.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table analytics-table analytics-launch-table mb-0">
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
                      {renderEditableCell(task, "title", {
                        inputClassName: "analytics-launch-title-input",
                        readClassName: "analytics-launch-title-read",
                      })}
                    </td>
                    <td>{renderEditableCell(task, "responsible")}</td>
                    <td>{renderEditableCell(task, "assignee", { readClassName: "analytics-launch-assignee-read", selectOptions: TASK_ASSIGNEES })}</td>
                    <td className="analytics-launch-comment">{renderEditableCell(task, "comment", { multiline: true, rows: 5 })}</td>
                    <td>{renderEditableCell(task, "dueDate", { inputClassName: "analytics-launch-date-input" })}</td>
                    <td>
                      <select
                        className={`form-select analytics-launch-priority-select analytics-launch-priority-${priorityTone}`}
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
                        className={`form-select analytics-launch-status-select analytics-launch-status-${statusTone}`}
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
      </section>

      <section className="analytics-task-lower-grid mt-4">
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
      </section>
        </>
      ) : null}
    </>
  );
}

export default LaunchChecklistSection;
