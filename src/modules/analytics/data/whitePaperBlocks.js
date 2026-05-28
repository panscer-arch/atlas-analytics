import atlasWhitePaperMarkdown from "../../../../docs/atlas-system-white-paper-v0.6.md?raw";

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
  const [intro, ...sections] = markdown.trim().split(/\n## /);
  const preparedSections = sections.map((section, index) => {
    const [rawTitle = "", ...contentLines] = section.split("\n");
    const title = normalizeTitle(rawTitle.replace(/^##\s*/, ""));
    const number = title.match(/^(\d+)/)?.[1] || String(index).padStart(2, "0");
    const meta = BLOCK_META[number] || {};
    const body = [title, "", contentLines.join("\n").trim()].filter(Boolean).join("\n");
    const text = index === 0 ? [intro.trim(), "", body].filter(Boolean).join("\n\n") : body;

    return {
      id: meta.id || createFallbackId(index),
      title,
      role: meta.role || "Раздел",
      status: "На вычитке",
      text,
      notes: "Рабочая версия v0.6. Вычитать на ясность, юридическую аккуратность и отсутствие обещаний результата.",
    };
  });

  return preparedSections;
}

export const defaultWhitePaperBlocks = createWhitePaperBlocks(atlasWhitePaperMarkdown);
