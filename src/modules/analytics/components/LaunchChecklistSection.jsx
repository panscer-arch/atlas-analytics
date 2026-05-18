import { useState } from "react";
import AgentKnowledgeTemplate from "./AgentKnowledgeTemplate";
import LaunchProgressBar from "./LaunchProgressBar";
import MaterialsLinksBoard from "./MaterialsLinksBoard";

const LAUNCH_CHECKLIST_STORAGE_KEY = "atlas.analytics.launchChecklist.tasks.v3";
const KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY = "atlas.analytics.knowledgeBaseChecklist.tasks.v1";
const IDEAS_CHECKLIST_STORAGE_KEY = "atlas.analytics.ideasChecklist.tasks.v1";
const CUSTOM_CHECKLISTS_STORAGE_KEY = "atlas.analytics.customChecklists.v1";
const LAUNCH_STATUSES = ["В работе", "Не в работе", "Готово", "Отложено"];
const LAUNCH_PRIORITIES = ["Срочно", "Высокий", "Средний", "Низкий"];
const TASK_ASSIGNEES = ["", "Bruno", "Digitex", "Gem", "Rotenberg"];

const defaultLaunchChecklistTasks = [
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

const defaultKnowledgeBaseChecklistTasks = [
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

const defaultIdeasChecklistTasks = [
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
    ...task,
  }));
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

function LaunchChecklistSection() {
  const [activeBoard, setActiveBoard] = useState("launch");
  const [launchTasks, setLaunchTasks] = useState(() => readStoredTasks(LAUNCH_CHECKLIST_STORAGE_KEY, defaultLaunchChecklistTasks));
  const [knowledgeBaseTasks, setKnowledgeBaseTasks] = useState(() => readStoredTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, defaultKnowledgeBaseChecklistTasks));
  const [ideaTasks, setIdeaTasks] = useState(() => readStoredTasks(IDEAS_CHECKLIST_STORAGE_KEY, defaultIdeasChecklistTasks));
  const [customChecklists, setCustomChecklists] = useState(readStoredCustomChecklists);
  const [newTask, setNewTask] = useState(() => createLaunchTask({ status: "В работе" }));
  const [newChecklistName, setNewChecklistName] = useState("");
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [editingCell, setEditingCell] = useState(null);

  const isKnowledgeBaseBoard = activeBoard === "knowledgeBase";
  const isIdeasBoard = activeBoard === "ideas";
  const isMaterialsBoard = activeBoard === "materials";
  const isAgentTasksBoard = activeBoard === "agentTasks";
  const activeCustomChecklist = customChecklists.find((checklist) => checklist.id === activeBoard);
  const isCustomBoard = Boolean(activeCustomChecklist);
  const visibleTasks = isCustomBoard ? activeCustomChecklist.tasks : isIdeasBoard ? ideaTasks : isKnowledgeBaseBoard ? knowledgeBaseTasks : launchTasks;
  const completedCount = visibleTasks.filter((task) => task.done || task.status === "Готово").length;
  const progress = visibleTasks.length ? (completedCount / visibleTasks.length) * 100 : 0;
  const boardTitle = isCustomBoard ? activeCustomChecklist.title : isIdeasBoard ? "Идеи" : isKnowledgeBaseBoard ? "Задачи базы знаний" : "Задачи запуска";
  const boardSubtitle = isCustomBoard
    ? "Пользовательский чек-лист с собственным набором задач."
    : isIdeasBoard
      ? "Сырые идеи разложены по направлениям, чтобы их можно было приоритизировать и превращать в задачи."
    : isMaterialsBoard
      ? "Карта Google Docs и Drive-ссылок по разделам: ТЗ, кабинет, ролики, документы, исследования и маркетинг."
    : isAgentTasksBoard
      ? "Editable-документ параметров для обучения AI-агента Atlas System."
    : isKnowledgeBaseBoard
      ? "Материалы, которые нужно подготовить и вычитать для базы знаний."
      : "Что нужно закрыть перед стартом";
  const boardDescription = isCustomBoard
    ? `Чек-лист «${activeCustomChecklist.title}»: добавляй задачи, назначай исполнителей и веди статусы.`
    : isIdeasBoard
      ? "Здесь вычитаны и структурированы идеи по контенту, комьюнити, партнерке, лендингам, smart-contract, вебинарам и исследованиям."
    : isMaterialsBoard
      ? "Здесь можно хранить такую же таблицу ссылок, как в Google Sheets: открыл документ, доработал и вернулся в аналитику."
    : isAgentTasksBoard
      ? "Здесь собран Atlas Agent Knowledge Parameters Template: параметры проекта, Web3, циклы, MLM, DAO, юридика, аналитика и заметки."
    : isKnowledgeBaseBoard
      ? "Здесь собраны презентация, FAQ, ролики, White Paper, MLM-материалы, вебинары и инструкции из фото."
      : "Здесь собраны задачи, ответственные, сроки и комментарии по тому, что нужно закрыть перед запуском проекта.";

  function updateTasks(storageKey, setTasks, updater) {
    setTasks((current) => {
      const next = updater(current);
      persistChecklistTasks(storageKey, next);
      return next;
    });
  }

  function updateTask(taskId, patch) {
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
      return;
    }

    const storageKey = isIdeasBoard ? IDEAS_CHECKLIST_STORAGE_KEY : isKnowledgeBaseBoard ? KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY : LAUNCH_CHECKLIST_STORAGE_KEY;
    const setTasks = isIdeasBoard ? setIdeaTasks : isKnowledgeBaseBoard ? setKnowledgeBaseTasks : setLaunchTasks;
    updateTasks(storageKey, setTasks, (current) => current.map((task) => (task.id === taskId ? patchChecklistTask(task, patch) : task)));
  }

  function addTask() {
    const title = newTask.title.trim();
    if (!title) return;

    const task = createLaunchTask({
      title,
      responsible: newTask.responsible.trim() || (isIdeasBoard ? "Идеи / приоритизация" : isKnowledgeBaseBoard ? "Контент / продукт" : "Не назначено"),
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
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isIdeasBoard) {
      updateTasks(IDEAS_CHECKLIST_STORAGE_KEY, setIdeaTasks, (current) => [task, ...current]);
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    if (isKnowledgeBaseBoard) {
      updateTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setKnowledgeBaseTasks, (current) => [task, ...current]);
      setNewTask(createLaunchTask({ status: "В работе" }));
      return;
    }

    updateTasks(LAUNCH_CHECKLIST_STORAGE_KEY, setLaunchTasks, (current) => [task, ...current]);
    setNewTask(createLaunchTask({ status: "В работе" }));
  }

  function removeTask(taskId) {
    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: checklist.tasks.filter((task) => task.id !== taskId) } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
      return;
    }

    const storageKey = isIdeasBoard ? IDEAS_CHECKLIST_STORAGE_KEY : isKnowledgeBaseBoard ? KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY : LAUNCH_CHECKLIST_STORAGE_KEY;
    const setTasks = isIdeasBoard ? setIdeaTasks : isKnowledgeBaseBoard ? setKnowledgeBaseTasks : setLaunchTasks;
    updateTasks(storageKey, setTasks, (current) => current.filter((task) => task.id !== taskId));
  }

  function resetTasks() {
    if (isCustomBoard) {
      setCustomChecklists((current) => {
        const next = current.map((checklist) => (checklist.id === activeBoard ? { ...checklist, tasks: [] } : checklist));
        persistChecklistTasks(CUSTOM_CHECKLISTS_STORAGE_KEY, next);
        return next;
      });
    } else if (isIdeasBoard) {
      updateTasks(IDEAS_CHECKLIST_STORAGE_KEY, setIdeaTasks, () => defaultIdeasChecklistTasks);
    } else if (isKnowledgeBaseBoard) {
      updateTasks(KNOWLEDGE_BASE_CHECKLIST_STORAGE_KEY, setKnowledgeBaseTasks, () => defaultKnowledgeBaseChecklistTasks);
    } else {
      updateTasks(LAUNCH_CHECKLIST_STORAGE_KEY, setLaunchTasks, () => defaultLaunchChecklistTasks);
    }
    setEditingCell(null);
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
      <section className="analytics-surface analytics-tab-summary mt-4">
        <span className="analytics-kicker">Задачи</span>
        <h2 className="analytics-tab-summary-title">Чек-листы команды</h2>
        <p className="analytics-tab-summary-copy">{boardDescription}</p>
        <div className="analytics-launch-browser-tabs" role="tablist" aria-label="Разделы чеклиста запуска">
          <button
            type="button"
            className={`analytics-launch-browser-tab${activeBoard === "launch" ? " analytics-launch-browser-tab-active" : ""}`}
            onClick={() => {
              setActiveBoard("launch");
              setEditingCell(null);
            }}
          >
            Задачи запуска
          </button>
          <button
            type="button"
            className={`analytics-launch-browser-tab${activeBoard === "knowledgeBase" ? " analytics-launch-browser-tab-active" : ""}`}
            onClick={() => {
              setActiveBoard("knowledgeBase");
              setEditingCell(null);
            }}
          >
            База знаний
          </button>
          <button
            type="button"
            className={`analytics-launch-browser-tab${activeBoard === "ideas" ? " analytics-launch-browser-tab-active" : ""}`}
            onClick={() => {
              setActiveBoard("ideas");
              setEditingCell(null);
            }}
          >
            Идеи
          </button>
          <button
            type="button"
            className={`analytics-launch-browser-tab${activeBoard === "materials" ? " analytics-launch-browser-tab-active" : ""}`}
            onClick={() => {
              setActiveBoard("materials");
              setEditingCell(null);
            }}
          >
            Материалы
          </button>
          <button
            type="button"
            className={`analytics-launch-browser-tab${activeBoard === "agentTasks" ? " analytics-launch-browser-tab-active" : ""}`}
            onClick={() => {
              setActiveBoard("agentTasks");
              setEditingCell(null);
            }}
          >
            Задачи
          </button>
          {customChecklists.map((checklist) => (
            <button
              key={checklist.id}
              type="button"
              className={`analytics-launch-browser-tab${activeBoard === checklist.id ? " analytics-launch-browser-tab-active" : ""}`}
              onClick={() => {
                setActiveBoard(checklist.id);
                setEditingCell(null);
              }}
            >
              {checklist.title}
            </button>
          ))}
          {isCreatingChecklist ? (
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
          ) : (
            <button type="button" className="analytics-launch-browser-tab analytics-launch-browser-tab-add" onClick={() => setIsCreatingChecklist(true)}>
              +
            </button>
          )}
        </div>
        {!isMaterialsBoard && !isAgentTasksBoard ? (
          <div className="analytics-tab-summary-points">
            <div className="analytics-tab-summary-point">
              <span>Всего задач: {visibleTasks.length}</span>
            </div>
            <div className="analytics-tab-summary-point">
              <span>Готово: {completedCount}</span>
            </div>
            <div className="analytics-tab-summary-point">
              <span>Прогресс запуска: {formatPercent(progress)}</span>
            </div>
          </div>
        ) : null}
      </section>

      {isMaterialsBoard ? <MaterialsLinksBoard /> : null}
      {isAgentTasksBoard ? <AgentKnowledgeTemplate /> : null}

      {!isMaterialsBoard && !isAgentTasksBoard ? (
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

      <section className="analytics-surface analytics-launch-form mt-4">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Добавить задачу</span>
            <h3 className="analytics-section-title">{isIdeasBoard ? "Новая идея" : isKnowledgeBaseBoard ? "Новая задача базы знаний" : "Новая задача"}</h3>
            <p className="analytics-page-subtitle mb-0">
              Заполни минимум название. Остальные поля можно поправить прямо в таблице.
            </p>
          </div>
          <button type="button" className="btn analytics-launch-reset-btn" onClick={resetTasks}>
            Сбросить к шаблону
          </button>
        </div>
        <div className="analytics-launch-form-grid">
          <label>
            <span>Название</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.title}
              onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
              placeholder={isIdeasBoard ? "Например: AMA-сессия" : isKnowledgeBaseBoard ? "Например: FAQ" : "Например: наполнить базу знаний"}
            />
          </label>
          <label>
            <span>Направление</span>
            <input
              className="form-control analytics-launch-input"
              value={newTask.responsible}
              onChange={(event) => setNewTask((current) => ({ ...current, responsible: event.target.value }))}
              placeholder={isIdeasBoard ? "Маркетинг / продукт" : isKnowledgeBaseBoard ? "Контент / продукт" : "Backend / продукт / DevOps"}
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
          <button type="button" className="btn analytics-launch-add-btn" onClick={addTask} disabled={!newTask.title.trim()}>
            Добавить задачу
          </button>
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
              {visibleTasks.map((task) => {
                const completed = task.done || task.status === "Готово";
                const statusTone = getLaunchStatusTone(task.status);
                const priority = task.priority || "Средний";
                const priorityTone = getLaunchPriorityTone(priority);

                return (
                  <tr key={task.id} className={completed ? "analytics-launch-task-done" : undefined}>
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
                        <button
                          type="button"
                          className="btn analytics-launch-icon-btn analytics-launch-done-btn"
                          onClick={() => updateTask(task.id, { status: "Готово", done: true })}
                          title="Готово"
                          aria-label={`Отметить задачу ${task.title} готовой`}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="btn analytics-launch-icon-btn analytics-launch-pause-btn"
                          onClick={() => updateTask(task.id, { status: "Отложено", done: false })}
                          title="Отложить"
                          aria-label={`Отложить задачу ${task.title}`}
                        >
                          ⏸
                        </button>
                        <button
                          type="button"
                          className="btn analytics-launch-icon-btn analytics-launch-delete-btn"
                          onClick={() => removeTask(task.id)}
                          title="Удалить"
                          aria-label={`Удалить задачу ${task.title}`}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
        </>
      ) : null}
    </>
  );
}

export default LaunchChecklistSection;
