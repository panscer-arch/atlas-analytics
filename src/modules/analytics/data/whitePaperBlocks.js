import atlasWhitePaperMarkdown from "../../../../docs/atlas-system-white-paper-public-ru-v1.md?raw";

const BLOCK_META = {
  "1": { id: "executive-summary", title: "Краткое резюме", role: "Публичное резюме" },
  "2": { id: "what-is-atlas", title: "Что такое Atlas", role: "Объяснение системы" },
  "3": { id: "participant-journey", title: "Как участник работает с Atlas", role: "Путь участника" },
  "4": { id: "smart-cycle", title: "Smart Cycle", role: "Основная механика" },
  "5": { id: "calculation-model", title: "Расчётная модель и примеры", role: "Экономика" },
  "6": { id: "daily-flow", title: "Daily Flow", role: "Длительная модель" },
  "7": { id: "platform-fee", title: "Platform Fee", role: "Комиссия платформы" },
  "8": { id: "technical-architecture", title: "Техническая архитектура", role: "Техническое описание" },
  "9": { id: "liquidity-claim", title: "Ликвидность и Claim", role: "Условия исполнения" },
  "10": { id: "partner-program", title: "Партнёрская программа", role: "Партнёрские правила" },
  "11": { id: "webinars-speakers", title: "Вебинары и спикеры", role: "Обучение" },
  "12": { id: "dao-inspired", title: "DAO-inspired механики", role: "Механики сообщества" },
  "13": { id: "risks", title: "Риски", role: "Раскрытие рисков" },
  "14": { id: "access-jurisdictions", title: "Доступ и юрисдикции", role: "Ограничения доступа" },
  "15": { id: "security-official-sources", title: "Безопасность и официальные источники", role: "Безопасность" },
  "16": { id: "versions-conclusion", title: "Версии и заключение", role: "Финальная рамка" },
};

function normalizeTitle(title) {
  return title.trim().replace(/\s+/g, " ");
}

function createFallbackId(index) {
  return `white-paper-section-${String(index).padStart(2, "0")}`;
}

function stripSectionNumber(title) {
  return normalizeTitle(title.replace(/^\d+(?:\.\d+)*\.?\s+/, ""));
}

function createWhitePaperBlocks(markdown) {
  const lines = markdown.trim().split("\n");
  const titleLine = lines[0]?.startsWith("# ") ? lines.shift().replace(/^#\s+/, "") : "Atlas System White Paper";
  const introLines = [];
  const sections = [];
  let currentSection = null;

  lines.forEach((line, index) => {
    const nextLine = lines[index + 1] || "";
    const previousNonEmptyLine = lines.slice(0, index).reverse().find((candidate) => candidate.trim()) || "";
    const currentNumber = Number(line.match(/^(\d+)\.\s/)?.[1] || 0);
    const previousListNumber = Number(previousNonEmptyLine.match(/^(\d+)\.\s/)?.[1] || 0);
    const isSequentialListItem = currentNumber > 1 && previousListNumber === currentNumber - 1;
    const isNumberedHeading = /^\d+(?:\.\d+)*\.?\s+\S/.test(line) && nextLine.trim() === "" && !isSequentialListItem;
    const isMarkdownHeading = /^##\s+\S/.test(line);

    if (isNumberedHeading || isMarkdownHeading) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: normalizeTitle(line.replace(/^##\s+/, "")),
        lines: [],
      };
      return;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      introLines.push(line);
    }
  });

  if (currentSection) sections.push(currentSection);

  const preparedSections = sections.map((section, index) => {
    const title = section.title;
    const number = title.match(/^(\d+(?:\.\d+)*)/)?.[1] || String(index).padStart(2, "0");
    const meta = BLOCK_META[number] || {};
    const displayTitle = meta.title || stripSectionNumber(title);
    const text = [title, "", section.lines.join("\n").trim()].filter(Boolean).join("\n");

    return {
      id: meta.id || createFallbackId(index),
      title: displayTitle,
      sourceTitle: title,
      sectionNumber: number,
      role: meta.role || "Раздел",
      status: "На вычитке",
      text,
      notes: "Публичная версия v1. Проверка ролями: обычный читатель — понятно ли; Web3-юрист — нет ли обещаний/ICO/custody; technical writer — совпадают ли термины, таблицы и логика.",
    };
  });

  return [
    {
      id: "cover",
      title: "Обложка White Paper",
      sourceTitle: titleLine,
      sectionNumber: "0",
      role: "Титульный блок",
      status: "На вычитке",
      text: [titleLine, "", introLines.join("\n").trim()].filter(Boolean).join("\n"),
      notes: "Обложка публичной версии для финальной вычитки. Проверить дату, версию, official URL и статус перед публикацией.",
    },
    ...preparedSections,
  ];
}

export const defaultWhitePaperBlocks = createWhitePaperBlocks(atlasWhitePaperMarkdown);
