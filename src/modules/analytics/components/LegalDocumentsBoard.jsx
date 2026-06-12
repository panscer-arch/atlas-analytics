import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import {
  COMMUNICATION_GUIDELINES_CONTENT,
  DOCUMENT_STATUSES,
  FEE_POLICY_CONTENT,
  GOVERNANCE_FRAMEWORK_CONTENT,
  INTERFACE_TERMS_CONTENT,
  LEGACY_INTERFACE_TERMS_CONTENT,
  LEGACY_PARTNER_RULES_CONTENT,
  LEGACY_PRIVACY_NOTICE_CONTENT,
  LEGACY_PROTOCOL_RULES_CONTENT,
  LEGACY_RISK_DISCLOSURE_CONTENT,
  LITEPAPER_CONTENT,
  NEW_INFO_END,
  NEW_INFO_START,
  PARTNER_RULES_CONTENT,
  PRIVACY_NOTICE_CONTENT,
  PROTOCOL_RULES_CONTENT,
  RISK_DISCLOSURE_CONTENT,
  SECURITY_LINKS_CONTENT,
  WHITE_PAPER_DOC_CONTENT,
  defaultLegalDocuments,
} from "../data/legalDocumentsData";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const LEGAL_DOCUMENTS_STORAGE_KEY = "atlas.analytics.legalDocuments.v1";

function normalizeDocument(document, index = 0) {
  const isLegacyProtocolRules =
    document.id === "protocol-rules" && (!document.content || document.content === LEGACY_PROTOCOL_RULES_CONTENT);
  const isOutdatedProtocolRules =
    document.id === "protocol-rules" &&
    String(document.content || "").includes("Версия: 0.1 / рабочий черновик") &&
    String(document.content || "").includes("Документ: Правила Smart Cycle Atlas System") &&
    !String(document.content || "").includes(NEW_INFO_START);
  const isLegacyRiskDisclosure =
    document.id === "risk-disclosure" && (!document.content || document.content === LEGACY_RISK_DISCLOSURE_CONTENT);
  const isLegacyInterfaceTerms =
    document.id === "interface-terms" && (!document.content || document.content === LEGACY_INTERFACE_TERMS_CONTENT);
  const isOutdatedInterfaceTerms =
    document.id === "interface-terms" &&
    String(document.content || "").includes("Версия: 0.1 / рабочий черновик") &&
    String(document.content || "").includes("Документ: Условия использования интерфейса Atlas System") &&
    !String(document.content || "").includes(NEW_INFO_START);
  const isLegacyPrivacyNotice =
    document.id === "privacy-notice" && (!document.content || document.content === LEGACY_PRIVACY_NOTICE_CONTENT);
  const isOutdatedPrivacyNotice =
    document.id === "privacy-notice" &&
    String(document.content || "").includes("Версия: 0.1 / рабочий черновик") &&
    String(document.content || "").includes("Документ: Политика конфиденциальности Atlas System") &&
    !String(document.content || "").includes(NEW_INFO_START);
  const isLegacyPartnerRules =
    document.id === "partner-rules" && (!document.content || document.content === LEGACY_PARTNER_RULES_CONTENT);
  const isOutdatedPartnerRules =
    document.id === "partner-rules" &&
    String(document.content || "").includes("Версия: 0.1 / рабочий черновик") &&
    String(document.content || "").includes("Документ: Правила партнёрской программы Atlas System") &&
    !String(document.content || "").includes(NEW_INFO_START);
  const isLegacySecurityLinks = document.id === "security-links" && !String(document.content || "").includes(NEW_INFO_START);
  const isLegacyWhitePaper = document.id === "white-paper" && !String(document.content || "").includes(NEW_INFO_START);
  const isLegacyLitepaper = document.id === "litepaper" && !String(document.content || "").includes(NEW_INFO_START);
  const isLegacyGovernance = document.id === "governance-framework" && !String(document.content || "").includes(NEW_INFO_START);
  const isLegacyFeePolicy = document.id === "fee-policy" && !String(document.content || "").includes(NEW_INFO_START);
  const isOutdatedFeePolicy =
    document.id === "fee-policy" &&
    String(document.content || "").includes("Версия: 0.1 / рабочий черновик") &&
    String(document.content || "").includes("Документ: Политика комиссии платформы Atlas System");
  const isLegacyCommunication = document.id === "communication-guidelines" && !String(document.content || "").includes(NEW_INFO_START);
  const isOutdatedCommunication =
    document.id === "communication-guidelines" &&
    String(document.content || "").includes("Документ: Правила коммуникации Atlas System") &&
    !String(document.content || "").includes("Speaker opening standard");

  return {
    id: document.id || `legal-doc-${Date.now()}-${index}`,
    title: document.title || "Новый документ",
    shortTitle: document.shortTitle || "",
    status:
      isLegacyProtocolRules ||
      isOutdatedProtocolRules ||
      isLegacyRiskDisclosure ||
      isLegacyInterfaceTerms ||
      isOutdatedInterfaceTerms ||
      isLegacyPrivacyNotice ||
      isOutdatedPrivacyNotice ||
      isLegacyPartnerRules ||
      isOutdatedPartnerRules ||
      isLegacySecurityLinks ||
      isLegacyWhitePaper ||
      isLegacyLitepaper ||
      isLegacyGovernance ||
      isLegacyFeePolicy ||
      isOutdatedFeePolicy ||
      isLegacyCommunication ||
      isOutdatedCommunication
        ? "Черновик"
        : document.status || "Нужно сделать",
    priority: document.priority || "Средний",
    purpose: document.purpose || "",
    content: isLegacyProtocolRules || isOutdatedProtocolRules
      ? PROTOCOL_RULES_CONTENT
      : isLegacyRiskDisclosure
        ? RISK_DISCLOSURE_CONTENT
        : isLegacyInterfaceTerms || isOutdatedInterfaceTerms
          ? INTERFACE_TERMS_CONTENT
          : isLegacyPrivacyNotice
            ? PRIVACY_NOTICE_CONTENT
            : isOutdatedPrivacyNotice
              ? PRIVACY_NOTICE_CONTENT
              : isLegacyPartnerRules || isOutdatedPartnerRules
                ? PARTNER_RULES_CONTENT
                : isLegacySecurityLinks
                  ? SECURITY_LINKS_CONTENT
                  : isLegacyWhitePaper
                    ? WHITE_PAPER_DOC_CONTENT
                    : isLegacyLitepaper
                      ? LITEPAPER_CONTENT
                      : isLegacyGovernance
                        ? GOVERNANCE_FRAMEWORK_CONTENT
                        : isLegacyFeePolicy || isOutdatedFeePolicy
                          ? FEE_POLICY_CONTENT
                          : isLegacyCommunication || isOutdatedCommunication
                            ? COMMUNICATION_GUIDELINES_CONTENT
                            : document.content || "",
    notes: isLegacyProtocolRules || isOutdatedProtocolRules
      ? "Обновлено до v0.2: добавлены расчётные параметры Smart Cycle и финансовые примеры. Перед публикацией сверить с финальными параметрами смарт-контракта, сетью, contract address, комиссиями и Risk Disclosure."
      : isLegacyRiskDisclosure
        ? "Показывать до участия и ссылаться из интерфейса, FAQ, партнёрки, вебинаров, White Paper и правил Smart Cycle."
        : isLegacyInterfaceTerms || isOutdatedInterfaceTerms
          ? "Обновлено до v0.2: добавлены функции личного кабинета, расчётные сценарии, вебинары и партнёрские показатели. Интерфейс остаётся Web3-инструментом, а не банком или гарантом результата."
          : isLegacyPrivacyNotice || isOutdatedPrivacyNotice
            ? "Обновлено до v0.2: добавлены referral attribution, вебинары, заявки спикеров и принцип минимизации данных."
            : isLegacyPartnerRules || isOutdatedPartnerRules
              ? "Обновлено до v0.2: добавлены карьерная лестница, проценты, matching bonus, Builder 4+ для вебинаров и бонус спикера 30-100 USDT."
              : isLegacySecurityLinks
                ? "Перед публикацией заполнить финальные домены, contract address, BscScan, audit/security status и официальные каналы."
                : isLegacyWhitePaper
                  ? "Обновлено до v6.4: добавлен Local Market Launch Review Standard для языковых кампаний и локальных партнёрских материалов."
                  : isLegacyLitepaper
                    ? "Короткая версия для новичков и вебинаров. После финализации правил Smart Cycle перенести точные цифры."
                    : isLegacyGovernance
                      ? "Пока draft: использовать, если DAO-голосования станут реальной функцией. Важно не менять задним числом активные Smart Cycle."
                      : isLegacyFeePolicy || isOutdatedFeePolicy
                        ? "Обновлено до v0.2: добавлены gross/net examples, network gas, Platform Fee source-of-truth, вебинарные бонусы, партнёрские начисления и правила изменения комиссии."
                        : isLegacyCommunication || isOutdatedCommunication
                          ? "Обновлено до v0.4: добавлены брендовая рамка Atlas, approved messages, speaker opening/closing standard, каналы коммуникации, review statuses и примеры переписывания опасных фраз."
                          : document.notes || "",
  };
}

function renderHighlightedLegalContent(content) {
  const parts = String(content || "").split(/(\[\[NEW\]\]|\[\[\/NEW\]\])/g);
  let isHighlighted = false;

  return parts.map((part, index) => {
    if (part === NEW_INFO_START) {
      isHighlighted = true;
      return null;
    }

    if (part === NEW_INFO_END) {
      isHighlighted = false;
      return null;
    }

    if (!part) return null;

    return (
      <span key={`${index}-${part.slice(0, 12)}`} className={isHighlighted ? "analytics-legal-doc-new-text" : undefined}>
        {part}
      </span>
    );
  });
}

function readStoredDocuments() {
  if (typeof window === "undefined") return defaultLegalDocuments;

  try {
    const saved = window.localStorage.getItem(LEGAL_DOCUMENTS_STORAGE_KEY);
    return saved ? JSON.parse(saved).map(normalizeDocument) : defaultLegalDocuments;
  } catch {
    return defaultLegalDocuments;
  }
}

function persistDocuments(documents) {
  try {
    window.localStorage.setItem(LEGAL_DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
    saveServerContent(LEGAL_DOCUMENTS_STORAGE_KEY, documents);
  } catch {
    // Документы останутся в состоянии страницы, даже если storage временно недоступен.
  }
}

function LegalDocumentsBoard() {
  const [documents, setDocuments] = useState(readStoredDocuments);
  const [activeDocumentId, setActiveDocumentId] = useState(() => {
    if (typeof window === "undefined") return defaultLegalDocuments[0].id;
    const url = new URL(window.location.href);
    return url.searchParams.get("doc") || defaultLegalDocuments[0].id;
  });

  useEffect(() => {
    let isMounted = true;

    loadServerContent(LEGAL_DOCUMENTS_STORAGE_KEY).then((savedDocuments) => {
      if (isMounted && Array.isArray(savedDocuments)) setDocuments(savedDocuments.map(normalizeDocument));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeDocument = documents.find((document) => document.id === activeDocumentId) || documents[0];
  const stats = useMemo(() => {
    const critical = documents.filter((document) => document.priority === "Критично").length;
    const ready = documents.filter((document) => document.status === "Готово").length;
    const review = documents.filter((document) => document.status === "На проверке").length;
    return [
      ["Документов", documents.length],
      ["Критично", critical],
      ["На проверке", review],
      ["Готово", ready],
    ];
  }, [documents]);

  useEffect(() => {
    if (!activeDocument || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("board", "legalDocs");
    url.searchParams.set("doc", activeDocument.id);
    window.history.replaceState({}, "", url.toString());
  }, [activeDocument]);

  function updateDocuments(updater) {
    setDocuments((current) => {
      const next = updater(current);
      persistDocuments(next);
      return next;
    });
  }

  function updateDocument(documentId, patch) {
    updateDocuments((current) => current.map((document) => (document.id === documentId ? { ...document, ...patch } : document)));
  }

  function addDocument() {
    const document = normalizeDocument({
      id: `legal-doc-${Date.now()}`,
      title: "Новый документ",
      shortTitle: "Draft",
      status: "Черновик",
      priority: "Средний",
      purpose: "Зачем нужен этот документ.",
      content: "Что должно быть внутри документа.",
      notes: "",
    });
    updateDocuments((current) => [...current, document]);
    setActiveDocumentId(document.id);
  }

  function removeDocument(documentId) {
    updateDocuments((current) => {
      const next = current.filter((document) => document.id !== documentId);
      if (activeDocument?.id === documentId) setActiveDocumentId(next[0]?.id || "");
      return next.length ? next : defaultLegalDocuments;
    });
  }

  if (!activeDocument) return null;

  return (
    <section className="analytics-surface analytics-agent-template analytics-agent-dataset">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">International Web3 docs</span>
          <h2 className="analytics-agent-template-title">Документы для Atlas</h2>
          <p className="analytics-page-subtitle">
            Рабочий список международных документов для smart-contract проекта: слева документ, справа описание, состав и статус.
          </p>
        </div>
        <AnalyticsActionButton variant="primary" size="sm" onClick={addDocument}>
          + документ
        </AnalyticsActionButton>
      </div>

      <div className="analytics-agent-dataset-stats">
        {stats.map(([label, value]) => (
          <div key={label} className="analytics-agent-dataset-stat">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="analytics-program-editor analytics-legal-docs-editor">
        <aside className="analytics-program-sidebar analytics-legal-docs-sidebar">
          <span className="analytics-kicker">Список документов</span>
          {documents.map((document, index) => (
            <button
              key={document.id}
              type="button"
              className={`analytics-legal-doc-tab${activeDocument.id === document.id ? " analytics-legal-doc-tab-active" : ""}`}
              onClick={() => setActiveDocumentId(document.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{document.title}</strong>
              <small>{document.shortTitle || document.priority}</small>
            </button>
          ))}
        </aside>

        <div className="analytics-program-main">
          <div className="analytics-legal-doc-head">
            <div>
              <span className="analytics-kicker">{activeDocument.shortTitle || "Document"}</span>
              <h3>{activeDocument.title}</h3>
              <p>{activeDocument.purpose || "Описание документа пока не заполнено."}</p>
            </div>
            <div className="analytics-legal-doc-status">
              <span>{activeDocument.priority}</span>
              <strong>{activeDocument.status}</strong>
            </div>
          </div>

          <div className="analytics-program-grid">
            <label>
              Название
              <input className="analytics-agent-template-input" value={activeDocument.title} onChange={(event) => updateDocument(activeDocument.id, { title: event.target.value })} />
            </label>
            <label>
              Короткое имя
              <input className="analytics-agent-template-input" value={activeDocument.shortTitle} onChange={(event) => updateDocument(activeDocument.id, { shortTitle: event.target.value })} />
            </label>
          </div>

          <div className="analytics-dataset-meta-row">
            <label>
              Статус
              <select className="analytics-agent-template-input" value={activeDocument.status} onChange={(event) => updateDocument(activeDocument.id, { status: event.target.value })}>
                {DOCUMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Приоритет
              <select className="analytics-agent-template-input" value={activeDocument.priority} onChange={(event) => updateDocument(activeDocument.id, { priority: event.target.value })}>
                {["Критично", "Высокий", "Средний", "Низкий"].map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
            <label>
              ID
              <input className="analytics-agent-template-input" value={activeDocument.id} readOnly />
            </label>
          </div>

          <label className="analytics-program-field">
            Описание документа
            <textarea className="analytics-agent-template-input" rows="4" value={activeDocument.purpose} onChange={(event) => updateDocument(activeDocument.id, { purpose: event.target.value })} />
          </label>

          <label className="analytics-program-field">
            Что должно быть внутри
            <textarea className="analytics-agent-template-input analytics-legal-doc-body" rows="8" value={activeDocument.content} onChange={(event) => updateDocument(activeDocument.id, { content: event.target.value })} />
          </label>

          <div className="analytics-legal-doc-preview">
            <div className="analytics-legal-doc-preview-head">
              <span>Предпросмотр документа</span>
              <small>Оранжевым подсвечена новая добавленная информация</small>
            </div>
            <div className="analytics-legal-doc-preview-body">{renderHighlightedLegalContent(activeDocument.content)}</div>
          </div>

          <label className="analytics-program-field">
            Заметки / решения
            <textarea className="analytics-agent-template-input" rows="4" value={activeDocument.notes} onChange={(event) => updateDocument(activeDocument.id, { notes: event.target.value })} />
          </label>

          <div className="analytics-program-danger">
            <AnalyticsActionButton variant="danger" size="sm" onClick={() => removeDocument(activeDocument.id)}>
              Удалить документ
            </AnalyticsActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LegalDocumentsBoard;
