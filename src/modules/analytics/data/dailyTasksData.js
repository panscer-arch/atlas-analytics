export const DAILY_TASKS_STORAGE_KEY = "atlas.analytics.dailyTasks.2026-05-22.v1";
export const DAILY_CHAT_AUTHOR_STORAGE_KEY = "atlas.analytics.dailyTasks.chatAuthor.v1";
export const DAILY_PEOPLE_STORAGE_KEY = "atlas.analytics.dailyTasks.people.v1";
export const ALL_PEOPLE_TAB_ID = "__all__";
export const LAUNCH_STATUSES = ["В работе", "Не в работе", "Готово", "Отложено"];
export const LAUNCH_PRIORITIES = ["Срочно", "Высокий", "Средний", "Низкий"];
export const DEFAULT_DAILY_PEOPLE = ["Бруно", "Гем", "Ротенберг", "Диджитекс", "Руби"];
export const DAILY_PERSON_ALIASES = {
  Бруно: ["Бруно", "Bruno"],
  Гем: ["Гем", "Game", "Gem"],
  Ротенберг: ["Ротенберг", "Roten Berg", "Rotenberg", "roten_berg"],
  Диджитекс: ["Диджитекс", "Дигитекс", "Digitex"],
  Руби: ["Руби", "Rubi", "Ruby"],
  Прогер: ["Прогер", "Ivanov", "Иванов", "Programmer", "Developer"],
};

export const defaultDailyTasks = [
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
