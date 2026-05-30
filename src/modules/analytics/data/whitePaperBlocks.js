import atlasWhitePaperMarkdown from "../../../../docs/atlas-system-white-paper-v6.4.md?raw";

const BLOCK_META = {
  "0": { id: "important-notice", title: "Важное уведомление", role: "Legal notice" },
  "0.05": { id: "international-abstract", title: "International Abstract", role: "Публичное резюме" },
  "0.1": { id: "key-facts", title: "Key Facts", role: "One-page summary" },
  "0.15": { id: "plain-language-summary", title: "Plain-Language Summary", role: "Объяснение для участника" },
  "0.155": { id: "plain-english-summary", title: "Plain-English Summary", role: "English public summary" },
  "0.16": { id: "pre-wallet-checklist", title: "Pre-Wallet Checklist", role: "Проверка до подписи" },
  "0.17": { id: "source-of-truth", title: "Source-of-Truth Hierarchy", role: "Иерархия источников" },
  "0.2": { id: "reader-guide", title: "Reader Guide", role: "Как читать документ" },
  "1": { id: "no-token-sale", title: "No Token Sale / No ICO", role: "Legal positioning" },
  "2": { id: "access-jurisdiction", title: "Access and Jurisdiction", role: "Доступ и ограничения" },
  "2.1": { id: "operating-model", title: "Operating Model", role: "No corporate guarantee" },
  "2.2": { id: "regulatory-posture", title: "Regulatory Posture Matrix", role: "Regulatory review" },
  "2.3": { id: "access-policy", title: "Access Policy Standard", role: "Access policy" },
  "2.4": { id: "participant-eligibility", title: "Participant Eligibility", role: "Self-assessment" },
  "3": { id: "executive-summary", title: "Executive Summary", role: "Краткое резюме" },
  "4": { id: "smart-cycle", title: "Smart Cycle", role: "Основная механика" },
  "5": { id: "calculation-model", title: "Расчётная модель", role: "Экономика" },
  "6": { id: "daily-flow", title: "Daily Flow", role: "Daily model" },
  "7": { id: "platform-fee", title: "Platform Fee", role: "Комиссия платформы" },
  "7.1": { id: "calculation-methodology", title: "Calculation Methodology", role: "Методика расчёта" },
  "7.2": { id: "financial-display", title: "Financial Display Standard", role: "Подача цифр" },
  "8": { id: "technical-architecture", title: "Technical Architecture", role: "Архитектура" },
  "9": { id: "participant-scenario", title: "Participant Scenario", role: "Путь участника" },
  "9.1": { id: "cycle-lifecycle", title: "Smart Cycle Lifecycle", role: "Жизненный цикл" },
  "10": { id: "liquidity-model", title: "Liquidity Model", role: "Ликвидность" },
  "10.1": { id: "treasury-operations", title: "Treasury Operations", role: "Liquidity operations" },
  "11": { id: "unity-lockup-conflict", title: "Unity Lockup Reconciliation", role: "Smart-spec conflict" },
  "12": { id: "unity-daily-conflict", title: "Unity Daily Reconciliation", role: "Smart-spec conflict" },
  "13": { id: "partner-program", title: "Partner Program", role: "Партнёрка" },
  "14": { id: "webinars-speakers", title: "Webinars and Speakers", role: "Вебинары" },
  "15": { id: "governance", title: "DAO-Inspired Governance", role: "Governance" },
  "16": { id: "security-model", title: "Security Model", role: "Безопасность" },
  "16.1": { id: "admin-controls", title: "Admin and Owner Controls", role: "Control disclosure" },
  "17": { id: "official-communications", title: "Official Communications", role: "Support boundaries" },
  "18": { id: "prohibited-use", title: "Prohibited Use", role: "Запрещённое использование" },
  "18.1": { id: "aml-abuse-control", title: "AML and Abuse-Control", role: "Abuse controls" },
  "19": { id: "risks", title: "Risks", role: "Риски" },
  "19.1": { id: "risk-severity", title: "Risk Severity Matrix", role: "Risk matrix" },
  "19.2": { id: "risk-opportunity", title: "Risk / Opportunity Balance", role: "Risk balance" },
  "19.2.1": { id: "opportunity-narrative", title: "Opportunity Narrative", role: "Opportunity wording" },
  "19.3": { id: "objection-handling", title: "FAQ / Objection Handling", role: "FAQ standard" },
  "19.4": { id: "ai-regression", title: "AI-Agent Regression", role: "AI QA" },
  "20": { id: "transparency-privacy-tax", title: "Transparency, Privacy and Tax", role: "Privacy/tax" },
  "21": { id: "disclosure-standard", title: "International Disclosure Standard", role: "Disclosure" },
  "22": { id: "external-review", title: "External Review Benchmarks", role: "Review benchmarks" },
  "23": { id: "roadmap", title: "Roadmap", role: "Дорожная карта" },
  "24": { id: "pre-public-decisions", title: "Before Public Version", role: "Open decisions" },
  "24.1": { id: "decision-register", title: "Final Decision Register", role: "Decision register" },
  "25": { id: "assumptions-register", title: "Assumptions Register", role: "Assumptions" },
  "26": { id: "readiness-matrix", title: "Publication Readiness Matrix", role: "Readiness" },
  "27": { id: "publication-mode", title: "Publication Mode", role: "Public vs internal" },
  "28": { id: "public-release-template", title: "Public Release Template", role: "Release template" },
  "28.1": { id: "editorial-cut", title: "Editorial Cut Checklist", role: "Editorial checklist" },
  "28.2": { id: "cover-status", title: "Cover and Status Block", role: "Status block" },
  "29": { id: "economic-reconciliation", title: "Economic Reconciliation", role: "Economics decision" },
  "30": { id: "sign-off-checklist", title: "Final Sign-Off Checklist", role: "Sign-off" },
  "30.1": { id: "sign-off-certificate", title: "Sign-Off Certificate", role: "Certificate" },
  "31": { id: "communication-control", title: "Marketing Communication Control", role: "Marketing control" },
  "32": { id: "localization-qa", title: "Translation and Localization QA", role: "Localization" },
  "32.1": { id: "local-market-review", title: "Local Market Launch Review", role: "Local launch" },
  "33": { id: "decision-screen", title: "Participant Decision Screen", role: "UI disclosure" },
  "33.1": { id: "acknowledgement-wording", title: "Acknowledgement Wording", role: "UI wording" },
  "33.1.1": { id: "comprehension-checks", title: "Comprehension Checks", role: "UX checks" },
  "33.2": { id: "journey-disclosure", title: "User Journey Disclosure Map", role: "Disclosure map" },
  "34": { id: "version-control", title: "Version Control", role: "Versioning" },
  "34.1": { id: "active-cycle-impact", title: "Active Cycle Change Impact", role: "Change impact" },
  "35": { id: "incident-response", title: "Incident Response", role: "Emergency comms" },
  "36": { id: "contract-registry", title: "Contract Address Registry", role: "Registry template" },
  "37": { id: "audit-security-status", title: "Audit and Security Status", role: "Security status" },
  "38": { id: "english-terminology", title: "Approved English Terminology", role: "Terminology" },
  "39": { id: "public-wording", title: "Approved Public Wording", role: "Public claims" },
  "39.1": { id: "claims-review", title: "Public Claims Review Matrix", role: "Claims review" },
  "40": { id: "traceability", title: "Contract-to-Document Traceability", role: "Traceability" },
  "40.1": { id: "numeric-evidence", title: "Numeric Claims Evidence", role: "Numbers evidence" },
  "41": { id: "evidence-pack", title: "Evidence Pack / Data Room", role: "Evidence pack" },
  "41.1": { id: "claim-acceptance", title: "Claim Acceptance Criteria", role: "Acceptance criteria" },
  "41.2": { id: "counsel-review-packet", title: "External Counsel Review Packet", role: "Legal review packet" },
  "42": { id: "legal-review-memo", title: "Web3 Legal Review Memo", role: "Legal review" },
  "42.1": { id: "counsel-opinion", title: "Counsel Opinion Standard", role: "Counsel opinion" },
  "42.2": { id: "red-team-review", title: "Red-Team Review", role: "Red-team" },
  "43": { id: "assembly-rules", title: "Public Assembly Rules", role: "Assembly rules" },
  "44": { id: "release-readiness-gate", title: "Release Readiness Gate", role: "Release gate" },
  "45": { id: "publication-archive", title: "Publication Archive", role: "Archive" },
  "45.1": { id: "monitoring-correction", title: "Monitoring and Correction Loop", role: "Post-publication" },
  "46": { id: "addendum-process", title: "Addendum Process", role: "Material changes" },
  "47": { id: "public-skeleton", title: "Public White Paper Skeleton", role: "Public skeleton" },
  "47.1": { id: "public-snapshot", title: "Final Public Snapshot", role: "One-page snapshot" },
  "48": { id: "publication-package", title: "Final Publication Package", role: "Publication package" },
  "49": { id: "glossary", title: "Glossary", role: "Терминология" },
  "50": { id: "conclusion", title: "Заключение", role: "Финальная рамка" },
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
      notes: "Рабочая версия v6.4 из документа White Paper. Вычитать на ясность, юридическую аккуратность, соответствие smart-spec и отсутствие обещаний результата.",
    };
  });

  return [
    {
      id: "cover",
      title: titleLine,
      sourceTitle: titleLine,
      sectionNumber: "0",
      role: "Титульный блок",
      status: "На вычитке",
      text: [titleLine, "", introLines.join("\n").trim()].filter(Boolean).join("\n"),
      notes: "Титульный блок рабочей версии v6.4. Проверить статус Draft, дату версии и публичную пригодность перед публикацией.",
    },
    ...preparedSections,
  ];
}

export const defaultWhitePaperBlocks = createWhitePaperBlocks(atlasWhitePaperMarkdown);
