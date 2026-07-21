import { useEffect, useMemo, useState } from "react";

import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";
import {
  DEFAULT_UTM_FIELDS,
  buildUtmUrl,
  parseUtmUrl,
} from "../utils/utmBuilderUtils";
import "../styles/utm-builder.css";

export const UTM_LINKS_STORAGE_KEY = "atlas.marketing.utmLinks.v1";

const EMPTY_FIELDS = {
  destinationUrl: "",
  source: "",
  medium: "",
  campaign: "",
  content: "",
  term: "",
  campaignId: "",
};

const FIELD_COPY = [
  {
    id: "destinationUrl",
    label: "Страница назначения",
    placeholder: "https://atlas-system.io/smartcycle-1/",
    required: true,
    wide: true,
  },
  {
    id: "source",
    label: "Источник",
    code: "utm_source",
    placeholder: "bscscan",
    required: true,
  },
  {
    id: "medium",
    label: "Канал",
    code: "utm_medium",
    placeholder: "display",
    required: true,
  },
  {
    id: "campaign",
    label: "Кампания",
    code: "utm_campaign",
    placeholder: "smartcycle1_launch_aug2026",
    required: true,
  },
  {
    id: "content",
    label: "Вариант объявления",
    code: "utm_content",
    placeholder: "header_text_v1",
  },
  {
    id: "term",
    label: "Ключевое слово",
    code: "utm_term",
    placeholder: "необязательно",
  },
  {
    id: "campaignId",
    label: "ID кампании",
    code: "utm_id",
    placeholder: "необязательно",
  },
];

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.url === "string")
    .slice(0, 30)
    .map((item) => ({
      id: String(item.id || `utm-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      label: String(item.label || item.campaign || "UTM-ссылка"),
      url: item.url,
      source: String(item.source || ""),
      campaign: String(item.campaign || ""),
      createdAt: String(item.createdAt || new Date().toISOString()),
    }));
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

export default function UtmBuilderPanel() {
  const [fields, setFields] = useState(DEFAULT_UTM_FIELDS);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [saveState, setSaveState] = useState("Загрузка журнала...");
  const [copiedValue, setCopiedValue] = useState("");
  const [importValue, setImportValue] = useState("");
  const [importError, setImportError] = useState("");

  const generated = useMemo(() => buildUtmUrl(fields), [fields]);

  useEffect(() => {
    let mounted = true;
    loadServerContent(UTM_LINKS_STORAGE_KEY).then((saved) => {
      if (!mounted) return;
      const nextHistory = normalizeHistory(saved);
      setHistory(nextHistory);
      if (!nextHistory.length) {
        try {
          const localSaved = window.localStorage.getItem(UTM_LINKS_STORAGE_KEY);
          if (localSaved) setHistory(normalizeHistory(JSON.parse(localSaved)));
        } catch {
          // Пустой журнал остаётся рабочим.
        }
      }
      setHistoryLoaded(true);
      setSaveState(saved ? "Журнал загружен с сервера" : "Журнал готов");
    });
    return () => {
      mounted = false;
    };
  }, []);

  function updateField(field, value) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function applyPreset() {
    setFields(DEFAULT_UTM_FIELDS);
    setImportError("");
  }

  function clearFields() {
    setFields(EMPTY_FIELDS);
    setImportValue("");
    setImportError("");
  }

  async function handleCopy(value, marker) {
    if (!value) return;
    const copied = await copyText(value);
    if (!copied) return;
    setCopiedValue(marker);
    window.setTimeout(() => setCopiedValue((current) => (current === marker ? "" : current)), 1400);
  }

  async function persistHistory(nextHistory) {
    setHistory(nextHistory);
    setSaveState("Сохраняем...");
    try {
      window.localStorage.setItem(UTM_LINKS_STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // Сервер остаётся основным хранилищем.
    }
    const saved = await saveServerContent(UTM_LINKS_STORAGE_KEY, nextHistory);
    setSaveState(saved ? "Сохранено на сервере" : "Сохранено локально");
  }

  async function saveGeneratedLink() {
    if (!historyLoaded || !generated.url) return;
    const duplicate = history.find((item) => item.url === generated.url);
    if (duplicate) {
      setSaveState("Такая ссылка уже есть в журнале");
      return;
    }

    const label = [fields.source, fields.campaign, fields.content]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" · ");
    const nextHistory = [
      {
        id: `utm-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label: label || "UTM-ссылка",
        url: generated.url,
        source: fields.source,
        campaign: fields.campaign,
        createdAt: new Date().toISOString(),
      },
      ...history,
    ].slice(0, 30);
    await persistHistory(nextHistory);
  }

  async function removeHistoryItem(itemId) {
    await persistHistory(history.filter((item) => item.id !== itemId));
  }

  function importLink() {
    const parsed = parseUtmUrl(importValue);
    if (!parsed) {
      setImportError("Не удалось прочитать ссылку. Проверьте адрес.");
      return;
    }
    setFields(parsed);
    setImportError("");
  }

  return (
    <section className="analytics-utm-builder">
      <header className="analytics-utm-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Campaign URL builder</p>
          <h2>UTM-ссылки</h2>
          <p>Собирайте единообразные рекламные ссылки Atlas и сохраняйте их в общем журнале команды.</p>
        </div>
        <div className="analytics-utm-hero-actions">
          <AnalyticsActionButton variant="primary" onClick={applyPreset}>BscScan · Smart Cycle 1</AnalyticsActionButton>
          <AnalyticsActionButton onClick={clearFields}>Очистить</AnalyticsActionButton>
        </div>
      </header>

      <section className="analytics-utm-workspace analytics-surface">
        <div className="analytics-utm-section-head">
          <div>
            <p className="analytics-kicker">Параметры кампании</p>
            <h3>Собрать ссылку</h3>
          </div>
          <span className={`analytics-utm-validation${generated.error ? " is-error" : " is-ready"}`}>
            {generated.error || "Ссылка готова"}
          </span>
        </div>

        <div className="analytics-utm-fields">
          {FIELD_COPY.map((field) => (
            <label key={field.id} className={field.wide ? "is-wide" : ""}>
              <span>
                {field.label}
                {field.required ? <b>*</b> : null}
                {field.code ? <code>{field.code}</code> : null}
              </span>
              <input
                value={fields[field.id]}
                onChange={(event) => updateField(field.id, event.target.value)}
                placeholder={field.placeholder}
                inputMode={field.id === "destinationUrl" ? "url" : "text"}
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
          ))}
        </div>

        <div className="analytics-utm-result">
          <div>
            <span>Готовая ссылка</span>
            <output>{generated.url || "Заполните обязательные поля"}</output>
          </div>
          <div className="analytics-utm-result-actions">
            <AnalyticsActionButton
              variant={copiedValue === "generated" ? "success" : "primary"}
              disabled={!generated.url}
              onClick={() => handleCopy(generated.url, "generated")}
            >
              {copiedValue === "generated" ? "Скопировано" : "Копировать"}
            </AnalyticsActionButton>
            <AnalyticsActionButton
              disabled={!generated.url}
              onClick={() => window.open(generated.url, "_blank", "noopener,noreferrer")}
            >
              Открыть
            </AnalyticsActionButton>
            <AnalyticsActionButton
              disabled={!generated.url || !historyLoaded}
              onClick={saveGeneratedLink}
            >
              Сохранить в журнал
            </AnalyticsActionButton>
          </div>
        </div>
      </section>

      <section className="analytics-utm-import analytics-surface">
        <div>
          <p className="analytics-kicker">Разбор ссылки</p>
          <h3>Загрузить существующую UTM-ссылку</h3>
        </div>
        <div className="analytics-utm-import-row">
          <input
            value={importValue}
            onChange={(event) => setImportValue(event.target.value)}
            placeholder="Вставьте готовую ссылку с UTM-метками"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
          />
          <AnalyticsActionButton onClick={importLink} disabled={!importValue.trim()}>Разобрать</AnalyticsActionButton>
        </div>
        {importError ? <p className="analytics-utm-import-error">{importError}</p> : null}
      </section>

      <section className="analytics-utm-history analytics-surface">
        <div className="analytics-utm-section-head">
          <div>
            <p className="analytics-kicker">Общий журнал</p>
            <h3>Сохранённые ссылки</h3>
          </div>
          <span className="analytics-utm-save-state">{saveState}</span>
        </div>

        {history.length ? (
          <div className="analytics-utm-history-list">
            {history.map((item) => (
              <article key={item.id}>
                <div className="analytics-utm-history-copy">
                  <strong>{item.label}</strong>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
                  <small>{formatDate(item.createdAt)}</small>
                </div>
                <div className="analytics-utm-history-actions">
                  <AnalyticsActionButton
                    size="sm"
                    variant={copiedValue === item.id ? "success" : "secondary"}
                    onClick={() => handleCopy(item.url, item.id)}
                  >
                    {copiedValue === item.id ? "Скопировано" : "Копировать"}
                  </AnalyticsActionButton>
                  <AnalyticsActionButton size="sm" variant="danger" onClick={() => removeHistoryItem(item.id)}>
                    Удалить
                  </AnalyticsActionButton>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="analytics-utm-empty">Сохранённых ссылок пока нет. Готовый BscScan-пресет уже заполнен выше.</p>
        )}
      </section>
    </section>
  );
}
