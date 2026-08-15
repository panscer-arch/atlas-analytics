import { Fragment, useMemo, useState } from "react";
import globalKeywordSource from "../data/listingsKeywords/01_GLOBAL_KEYWORD_ARCHITECTURE_RU.md?raw";
import regionalKeywordSource from "../data/listingsKeywords/02_REGIONAL_LANGUAGE_KEYWORDS_RU.md?raw";
import platformKeywordSource from "../data/listingsKeywords/03_PLATFORM_SEARCH_PLAYBOOK_RU.md?raw";

type KeywordDocumentId = "global" | "regional" | "platform";
type KeywordDocument = {
  id: KeywordDocumentId;
  label: string;
  shortLabel: string;
  description: string;
  source: string;
};
type KeywordSection = { id: string; title: string; body: string };
type ContentChunk = { type: "text" | "code"; value: string; language?: string };

const DOCUMENTS: KeywordDocument[] = [
  {
    id: "global",
    label: "Глобальное ядро",
    shortLabel: "GLOBAL",
    description: "Роли, ранги, действия, события, Web3-сегменты и запросы wide / medium / narrow.",
    source: globalKeywordSource,
  },
  {
    id: "regional",
    label: "Региональные языки",
    shortLabel: "7 ЯЗЫКОВ",
    description: "PT-BR, ES-LATAM, FR-Africa, Turkish, Bahasa Indonesia, Hindi/Hinglish и English.",
    source: regionalKeywordSource,
  },
  {
    id: "platform",
    label: "Поиск по площадкам",
    shortLabel: "8 КАНАЛОВ",
    description: "Полный playbook для YouTube, LinkedIn, X, Facebook, Instagram, TikTok, Telegram и Google.",
    source: platformKeywordSource,
  },
];

function sectionId(documentId: string, index: number) {
  return `keyword-${documentId}-${index + 1}`;
}

function parseSections(document: KeywordDocument): KeywordSection[] {
  const lines = document.source.replace(/\r/g, "").split("\n");
  const sections: KeywordSection[] = [];
  let title = "Введение";
  let body: string[] = [];
  const flush = () => {
    const value = body.join("\n").trim();
    if (value) sections.push({ id: sectionId(document.id, sections.length), title, body: value });
    body = [];
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      title = heading[1].trim();
    } else if (!line.startsWith("# ")) {
      body.push(line);
    }
  }
  flush();
  return sections;
}

function splitContent(source: string): ContentChunk[] {
  const chunks: ContentChunk[] = [];
  const pattern = /```([^\n]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    if (match.index > cursor) chunks.push({ type: "text", value: source.slice(cursor, match.index) });
    chunks.push({ type: "code", language: match[1].trim(), value: match[2].trim() });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) chunks.push({ type: "text", value: source.slice(cursor) });
  return chunks.filter((chunk) => chunk.value.trim());
}

function renderInline(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).filter(Boolean);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={`${part}-${index}`}>{bold[1]}</strong>;
    const code = part.match(/^`(.+)`$/);
    if (code) return <code key={`${part}-${index}`}>{code[1]}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a href={link[2]} target="_blank" rel="noreferrer" key={`${part}-${index}`}>{link[1]} ↗</a>;
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function MarkdownText({ source }: { source: string }) {
  return <div className="keyword-markdown-text">{source.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div className="keyword-spacer" key={`space-${index}`} />;
    const heading = trimmed.match(/^(#{3,4})\s+(.+)$/);
    if (heading) return heading[1].length === 3
      ? <h4 key={`heading-${index}`}>{renderInline(heading[2])}</h4>
      : <h5 key={`heading-${index}`}>{renderInline(heading[2])}</h5>;
    if (/^\|.*\|$/.test(trimmed)) return <div className="keyword-table-row" key={`table-${index}`}>{trimmed}</div>;
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) return <div className="keyword-list-line" key={`bullet-${index}`}><span>•</span><p>{renderInline(bullet[1])}</p></div>;
    const numbered = trimmed.match(/^(\d+\.)\s+(.+)$/);
    if (numbered) return <div className="keyword-list-line" key={`number-${index}`}><span>{numbered[1]}</span><p>{renderInline(numbered[2])}</p></div>;
    if (/^---+$/.test(trimmed)) return <hr key={`rule-${index}`} />;
    return <p key={`text-${index}`}>{renderInline(trimmed)}</p>;
  })}</div>;
}

function KeywordSectionBody({ section, documentId, onCopy, copied }: {
  section: KeywordSection;
  documentId: string;
  onCopy: (id: string, value: string) => void;
  copied: string;
}) {
  const chunks = useMemo(() => splitContent(section.body), [section.body]);
  const sectionCopyId = `${documentId}-${section.id}-section`;
  return <div className="keyword-section-body"><div className="keyword-section-actions"><span>{section.body.split("\n").length} строк в разделе</span><button type="button" onClick={() => onCopy(sectionCopyId, section.body)}>{copied === sectionCopyId ? "Раздел скопирован ✓" : "Копировать весь раздел"}</button></div>{chunks.map((chunk, index) => {
    if (chunk.type === "text") return <MarkdownText source={chunk.value} key={`${section.id}-text-${index}`} />;
    const copyId = `${documentId}-${section.id}-code-${index}`;
    return <div className="keyword-code" key={copyId}><header><span>{chunk.language || "SEARCH QUERIES"}</span><button type="button" onClick={() => onCopy(copyId, chunk.value)}>{copied === copyId ? "Скопировано ✓" : "Копировать блок"}</button></header><pre><code>{chunk.value}</code></pre></div>;
  })}</div>;
}

export default function ListingsKeywordLibrary() {
  const [activeId, setActiveId] = useState<KeywordDocumentId>("global");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");
  const activeDocument = DOCUMENTS.find((document) => document.id === activeId) || DOCUMENTS[0];
  const sections = useMemo(() => parseSections(activeDocument), [activeDocument]);
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");
  const visibleSections = useMemo(() => normalizedQuery
    ? sections.filter((section) => `${section.title}\n${section.body}`.toLocaleLowerCase("ru").includes(normalizedQuery))
    : sections, [normalizedQuery, sections]);
  const lineCount = activeDocument.source.replace(/\r/g, "").trimEnd().split("\n").length;
  const codeBlockCount = Math.floor((activeDocument.source.match(/```/g) || []).length / 2);

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => current === id ? "" : current), 1800);
    } catch {
      setCopied("");
    }
  };

  const selectSection = (id: string) => {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <section className="keyword-library" data-testid="listings-keyword-library">
    <header className="keyword-library-head"><div><span className="eyebrow">ПОЛНАЯ БИБЛИОТЕКА · 2 645 СТРОК</span><h2>Расширенные ключевики для поиска лидеров</h2><p>Исходные экспертные материалы перенесены целиком. Выберите ядро, язык или площадку, найдите термин и скопируйте готовый блок запросов.</p></div><div className="keyword-formula"><span>Формула запроса</span><strong>ROLE + EVIDENCE + MARKET + FORMAT</strong><small>Один рынок · один сегмент · одна площадка</small></div></header>

    <div className="keyword-document-tabs" role="tablist" aria-label="Наборы ключевых слов">{DOCUMENTS.map((document) => <button type="button" role="tab" aria-selected={document.id === activeId} className={document.id === activeId ? "active" : ""} onClick={() => { setActiveId(document.id); setQuery(""); }} key={document.id}><span>{document.shortLabel}</span><strong>{document.label}</strong><small>{document.description}</small></button>)}</div>

    <div className="keyword-toolbar"><label className="keyword-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например: líder de equipe, event organizer, LinkedIn…" aria-label="Поиск по полной библиотеке ключевиков" /></label><label className="keyword-jump"><span>Перейти к разделу</span><select value="" onChange={(event) => selectSection(event.target.value)}><option value="">Выберите раздел</option>{visibleSections.map((section) => <option value={section.id} key={section.id}>{section.title}</option>)}</select></label></div>

    <div className="keyword-library-meta"><div><b>{lineCount.toLocaleString("ru-RU")}</b><span>строк в наборе</span></div><div><b>{sections.length}</b><span>основных разделов</span></div><div><b>{codeBlockCount}</b><span>копируемых блоков</span></div><p>{activeDocument.description}</p></div>

    {visibleSections.length ? <div className="keyword-sections">{visibleSections.map((section, index) => <details id={section.id} key={section.id} open={normalizedQuery ? true : undefined}><summary><div><span>{String(index + 1).padStart(2, "0")}</span><strong>{section.title}</strong></div><b>Открыть</b></summary><KeywordSectionBody section={section} documentId={activeDocument.id} copied={copied} onCopy={copy} /></details>)}</div> : <div className="keyword-no-results"><strong>Совпадений нет</strong><p>Попробуйте роль, страну, язык, название площадки или часть запроса.</p></div>}
  </section>;
}
