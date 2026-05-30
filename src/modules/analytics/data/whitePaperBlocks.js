import atlasWhitePaperMarkdown from "../../../../docs/atlas-system-white-paper-v6.4.md?raw";

const BLOCK_META = {
  "00": { id: "cover", role: "Титульный блок" },
  "01": { id: "why-atlas", role: "Проблема и позиционирование" },
  "02": { id: "smart-cycle", role: "Основная механика" },
  "03": { id: "no-promises", role: "Юридическая и смысловая рамка" },
  "04": { id: "mutual-help-logic", role: "Логика ликвидности" },
  "05": { id: "cycle-types", role: "Продуктовая линейка" },
  "06": { id: "cycle-lifecycle", role: "Жизненный цикл продукта" },
  "07": { id: "liquidity-claim", role: "Запрос помощи" },
  "08": { id: "risks", role: "Риск-блок" },
  "09": { id: "partners", role: "Партнерская программа" },
  "10": { id: "dao", role: "DAO и управление" },
  "11": { id: "security", role: "Безопасность" },
  "12": { id: "ecosystem", role: "Экосистема" },
  "13": { id: "glossary", role: "Терминология" },
  "14": { id: "final-frame", role: "Финальная рамка" },
};

function normalizeTitle(title) {
  return title.trim().replace(/\s+/g, " ");
}

function createFallbackId(index) {
  return `white-paper-section-${String(index).padStart(2, "0")}`;
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
    const text = [title, "", section.lines.join("\n").trim()].filter(Boolean).join("\n");

    return {
      id: meta.id || createFallbackId(index),
      title,
      role: meta.role || "Раздел",
      status: "На вычитке",
      text,
      notes: "Рабочая версия v6.4 из документа White Paper. Вычитать на ясность, юридическую аккуратность, соответствие smart-spec и отсутствие обещаний результата.",
    };
  });

  return [
    {
      id: "cover",
      title: titleLine,
      role: "Титульный блок",
      status: "На вычитке",
      text: [titleLine, "", introLines.join("\n").trim()].filter(Boolean).join("\n"),
      notes: "Титульный блок рабочей версии v6.4. Проверить статус Draft, дату версии и публичную пригодность перед публикацией.",
    },
    ...preparedSections,
  ];
}

export const defaultWhitePaperBlocks = createWhitePaperBlocks(atlasWhitePaperMarkdown);
