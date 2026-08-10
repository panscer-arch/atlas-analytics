import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import initialData from "../data/listingsCrmInitialData.json";
import crmCss from "./ListingsCrmBoard.css?raw";
import { loadServerContentResult, saveServerContentResult } from "../services/contentStore";

const CRM_CONTENT_KEY = "atlas.analytics.listingsCrm.v1";

type ProofItem = {
  id: string; url: string; fileName: string; createdAt: string; note: string;
};

type CrmRecord = {
  id: string; source: string; name: string; type: string; priority: string;
  status: string; owner: string; dueDate: string; firstContact: string;
  action: string; summary: string; benefit: string; price: string;
  notes: string; channel: string; link: string; updatedAt: string;
  paymentAmount?: string; paymentOptions?: string; paymentReference?: string;
  paymentInstructions?: string;
  proofs?: ProofItem[];
  placementStart?: string; placementTerm?: string; renewalDate?: string; renewalNotes?: string;
};

type CrmData = {
  meta: { project: string; generatedAt: string; timezone: string; sourceSpreadsheet: string; recordCount: number };
  records: CrmRecord[];
};

const EMPTY_DATA: CrmData = {
  meta: { project: "Atlas System", generatedAt: "", timezone: "Europe/Moscow", sourceSpreadsheet: "", recordCount: 0 },
  records: [],
};

const STATUSES = [
  "Не обработано", "Требует проверки", "Готовим обращение", "Отправлено — ждём ответ",
  "Ожидаем ответ", "Ожидаем оплату", "Проверка публикации",
  "Запланировано позже", "В работе", "Опубликовано", "Блокер", "Закрыто",
];

const NAV = [
  { id: "overview", label: "Обзор", icon: "⌂" },
  { id: "today", label: "План дня", icon: "✓" },
  { id: "listings", label: "Листинги", icon: "◇" },
  { id: "promo", label: "Промо-каналы", icon: "↗" },
  { id: "partners", label: "Партнёрства", icon: "◎" },
  { id: "all", label: "Все записи", icon: "≡" },
];

function localDate(days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
}

function shortDate(value: string) {
  if (!value) return "Без даты";
  const normalized = value.includes(".") ? value.split(".").reverse().join("-") : value;
  const date = new Date(normalized + (normalized.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function urlFromText(value: string) {
  return value.match(/https?:\/\/[^\s]+/)?.[0] || "";
}

function toneFor(status: string) {
  const value = status.toLowerCase();
  if (value.includes("опублик") || value.includes("в работе")) return "green";
  if (value.includes("закры") || value.includes("блок")) return "red";
  if (value.includes("оплат")) return "violet";
  if (value.includes("отправ") || value.includes("ожида") || value.includes("провер")) return "amber";
  return "gray";
}

function priorityValue(priority: string) {
  if (priority === "P0" || priority === "A") return 0;
  if (priority === "P1" || priority === "B") return 1;
  if (priority === "P2" || priority === "C") return 2;
  if (priority === "P3") return 3;
  const numeric = Number(priority);
  return Number.isFinite(numeric) ? 100 - numeric : 50;
}

function ListingsCrmWorkspace() {
  const [data, setData] = useState<CrmData>(EMPTY_DATA);
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Все статусы");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState("Сохранено");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [proofState, setProofState] = useState("");

  useEffect(() => {
    loadServerContentResult(CRM_CONTENT_KEY)
      .then((result) => {
        if (result.ok && result.exists && result.value?.records) {
          setData(result.value);
          return;
        }
        setData(initialData as CrmData);
        setSaveState(result.ok ? "Готово к первому сохранению" : "Открыта резервная копия");
      })
      .finally(() => setLoading(false));
  }, []);

  const today = localDate(0);
  const tomorrow = localDate(1);
  const selected = data.records.find((item) => item.id === selectedId) ?? null;
  const selectedProofs = selected?.proofs || [];
  const primaryProof = selectedProofs.length > 0 ? selectedProofs[selectedProofs.length - 1] : null;
  const primaryProofLink = primaryProof ? urlFromText(primaryProof.note) || selected?.link || "" : "";

  const scopeRecords = useMemo(() => {
    let records = [...data.records];
    if (view === "today") records = records.filter((item) => item.dueDate === today || item.dueDate === tomorrow);
    if (view === "listings") records = records.filter((item) => item.source === "Листинги");
    if (view === "promo") records = records.filter((item) => item.source === "Промо");
    if (view === "partners") records = records.filter((item) => item.source === "Партнёрства");
    if (query.trim()) {
      const needle = query.toLowerCase();
      records = records.filter((item) =>
        [item.name, item.status, item.action, item.notes, item.type].join(" ").toLowerCase().includes(needle)
      );
    }
    if (status !== "Все статусы") records = records.filter((item) => item.status === status);
    const sorted = records.sort((a, b) =>
      (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
      priorityValue(a.priority) - priorityValue(b.priority)
    );
    return view === "overview" ? sorted.slice(0, 15) : sorted;
  }, [data.records, view, query, status, today, tomorrow]);

  const stats = useMemo(() => ({
    total: data.records.length,
    today: data.records.filter((item) => item.dueDate === today).length,
    tomorrow: data.records.filter((item) => item.dueDate === tomorrow).length,
    waiting: data.records.filter((item) => /ожида|отправ|провер/i.test(item.status)).length,
    payment: data.records.filter((item) => /оплат/i.test(item.status)).length,
    published: data.records.filter((item) => /опублик/i.test(item.status)).length,
    renewals: data.records.filter((item) => {
      if (!item.renewalDate) return false;
      const days = (new Date(item.renewalDate).getTime() - new Date(today).getTime()) / 86400000;
      return days >= 0 && days <= 30;
    }).length,
  }), [data.records, today, tomorrow]);

  const updateRecord = (id: string, field: keyof CrmRecord, value: string) => {
    setData((current) => ({
      ...current,
      records: current.records.map((item) =>
        item.id === id ? { ...item, [field]: value, updatedAt: new Date().toISOString() } : item
      ),
    }));
    setDirty(true);
    setSaveState("Есть изменения");
  };

  const copyText = async (field: string, value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1600);
  };

  const uploadProof = async (file: File) => {
    if (!selected || !file.type.startsWith("image/")) return;
    setProofState("Загружаю скриншот…");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    try {
      const proof: ProofItem = {
        id: crypto.randomUUID(),
        url: dataUrl,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        note: "Скриншот размещённого листинга",
      };
      const nextData = {
        ...data,
        meta: { ...data.meta, generatedAt: new Date().toISOString() },
        records: data.records.map((item) =>
          item.id === selected.id ? { ...item, proofs: [...(item.proofs || []), proof], updatedAt: new Date().toISOString() } : item
        ),
      };
      const saveResult = await saveServerContentResult(CRM_CONTENT_KEY, nextData);
      if (!saveResult.ok) throw new Error();
      setData(nextData);
      setDirty(false);
      setSaveState("Сохранено в CRM");
      setProofState("Скриншот добавлен");
    } catch {
      setProofState("Не удалось добавить скриншот");
    }
  };

  const updateProof = (recordId: string, proofId: string, note: string) => {
    setData((current) => ({
      ...current,
      records: current.records.map((item) =>
        item.id === recordId
          ? { ...item, proofs: (item.proofs || []).map((proof) => proof.id === proofId ? { ...proof, note } : proof) }
          : item
      ),
    }));
    setDirty(true);
    setSaveState("Есть изменения");
  };

  const removeProof = async (recordId: string, proof: ProofItem) => {
    if (!window.confirm("Удалить этот скриншот?")) return;
    setData((current) => ({
      ...current,
      records: current.records.map((item) =>
        item.id === recordId ? { ...item, proofs: (item.proofs || []).filter((entry) => entry.id !== proof.id) } : item
      ),
    }));
    setDirty(true);
    setSaveState("Есть изменения");
  };

  const save = async () => {
    setSaveState("Сохраняю…");
    const payload = { ...data, meta: { ...data.meta, recordCount: data.records.length, generatedAt: new Date().toISOString() } };
    try {
      const result = await saveServerContentResult(CRM_CONTENT_KEY, payload);
      if (!result.ok) throw new Error();
      setData(payload);
      setDirty(false);
      setSaveState("Сохранено в CRM");
    } catch {
      setSaveState("Не удалось сохранить");
    }
  };

  const addRecord = () => {
    const item: CrmRecord = {
      id: "manual-" + crypto.randomUUID(),
      source: view === "listings" ? "Листинги" : view === "partners" ? "Партнёрства" : "Промо",
      name: "Новая задача", type: "", priority: "A", status: "Не обработано",
      owner: "Atlas Partnerships", dueDate: tomorrow, firstContact: "", action: "",
      summary: "", benefit: "", price: "", notes: "", channel: "", link: "",
      paymentAmount: "", paymentOptions: "", paymentReference: "", paymentInstructions: "",
      proofs: [],
      placementStart: "", placementTerm: "Срок размещения не подтверждён", renewalDate: "",
      renewalNotes: "Уточнить срок и условия продления у площадки.",
      updatedAt: new Date().toISOString(),
    };
    setData((current) => ({ ...current, records: [item, ...current.records] }));
    setSelectedId(item.id);
    setDirty(true);
    setSaveState("Есть изменения");
  };

  const removeRecord = (id: string) => {
    if (!window.confirm("Удалить эту запись из CRM?")) return;
    setData((current) => ({ ...current, records: current.records.filter((item) => item.id !== id) }));
    setSelectedId(null);
    setDirty(true);
    setSaveState("Есть изменения");
  };

  const title = NAV.find((item) => item.id === view)?.label ?? "Обзор";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div><strong>ATLAS</strong><span>PARTNERS CRM</span></div>
        </div>
        <nav>
          <p className="nav-caption">РАБОЧЕЕ ПРОСТРАНСТВО</p>
          {NAV.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span>{item.icon}</span>{item.label}
              {item.id === "today" && stats.tomorrow > 0 && <b>{stats.tomorrow}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sync-dot" />
          <div><strong>Закрытый режим</strong><span>Доступ только для команды</span></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            <p className="topbar-subtitle">Листинги, реклама и партнёрства Atlas System</p>
          </div>
          <div className="top-actions">
            <div className={dirty ? "save-state dirty" : "save-state"}><i /> {saveState}</div>
            <button className="button secondary" onClick={addRecord}>＋ Новая задача</button>
            <button className="button primary" onClick={save} disabled={!dirty}>Сохранить</button>
          </div>
        </header>

        {loading ? (
          <div className="loading"><div className="loader" /><p>Открываю защищённую базу Atlas…</p></div>
        ) : (
          <>
            <section className="metrics">
              <article><span>Задачи на завтра</span><strong>{stats.tomorrow}</strong><small>проверить {shortDate(tomorrow)}</small></article>
              <article><span>Ждём ответ</span><strong>{stats.waiting}</strong><small>контролировать почту</small></article>
              <article><span>Ждут оплату</span><strong>{stats.payment}</strong><small>сверить реквизиты</small></article>
              <article><span>Продлить в 30 дней</span><strong>{stats.renewals}</strong><small>ближайшие продления</small></article>
            </section>

            <section className="board">
              <div className="board-head">
                <div><h3>{view === "overview" ? "Ближайшие задачи" : title}</h3><p>{scopeRecords.length} записей показано</p></div>
                <div className="filters">
                  <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по CRM" /></label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option>Все статусы</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Проект / площадка</th><th>Направление</th><th>Статус</th><th>Следующее действие</th><th>Пруф</th><th>Продление</th><th>Контроль</th><th /></tr></thead>
                  <tbody>
                    {scopeRecords.map((item) => (
                      <tr key={item.id} onClick={() => setSelectedId(item.id)}>
                        <td><div className="record-name"><span>{item.name.slice(0, 1)}</span><div><strong>{item.name}</strong><small>{item.type || item.channel || "Без категории"}</small></div></div></td>
                        <td><span className="source-label">{item.source}</span><small className="priority">{item.priority}</small></td>
                        <td><span className={"status tone-" + toneFor(item.status)}><i />{item.status}</span></td>
                        <td><p className="action-text">{item.action || "Следующее действие не задано"}</p></td>
                        <td>
                          {(item.proofs || []).length > 0
                            ? <span className="proof-badge ready"><i />{(item.proofs || []).length} пруф.</span>
                            : item.source === "Листинги"
                              ? <span className="proof-badge"><i />Пруфа нет</span>
                              : <span className="not-applicable">—</span>}
                        </td>
                        <td><span className={item.renewalDate ? "renewal-date" : "renewal-date unknown"}>{item.renewalDate ? shortDate(item.renewalDate) : "Уточнить"}</span></td>
                        <td><span className={item.dueDate === today || item.dueDate === tomorrow ? "due urgent" : "due"}>{shortDate(item.dueDate)}</span></td>
                        <td><button className="row-arrow">→</button></td>
                      </tr>
                    ))}
                    {scopeRecords.length === 0 && <tr><td colSpan={8}><div className="empty">По этим фильтрам записей нет</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>

      {selected && (
        <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedId(null)}>
          <aside className="drawer">
            <div className="drawer-head">
              <div><span className="source-label">{selected.source}</span><small>{selected.priority}</small></div>
              <button onClick={() => setSelectedId(null)}>×</button>
            </div>
            <h2>{selected.name}</h2><p className="drawer-type">{selected.type}</p>

            {/оплат/i.test(selected.status) && (
              <section className="payment-panel">
                <div className="payment-head">
                  <div><span>Оплата</span><h3>Реквизиты и инструкция</h3></div>
                  <b>Сверить перед переводом</b>
                </div>
                <div className="payment-grid">
                  <label>
                    <span className="field-caption"><span>Сумма</span><button type="button" className="copy-button" onClick={() => copyText("amount", selected.paymentAmount || "")}><i />{copiedField === "amount" ? "Скопировано" : "Копировать"}</button></span>
                    <input value={selected.paymentAmount || ""} onChange={(e) => updateRecord(selected.id, "paymentAmount", e.target.value)} />
                  </label>
                  <label>
                    <span className="field-caption"><span>Назначение / Reference</span><button type="button" className="copy-button" onClick={() => copyText("reference", selected.paymentReference || "")}><i />{copiedField === "reference" ? "Скопировано" : "Копировать"}</button></span>
                    <input value={selected.paymentReference || ""} onChange={(e) => updateRecord(selected.id, "paymentReference", e.target.value)} />
                  </label>
                  <label className="wide">
                    <span className="field-caption"><span>Сети и адреса</span><button type="button" className="copy-button" onClick={() => copyText("options", selected.paymentOptions || "")}><i />{copiedField === "options" ? "Скопировано" : "Копировать"}</button></span>
                    <textarea rows={4} value={selected.paymentOptions || ""} onChange={(e) => updateRecord(selected.id, "paymentOptions", e.target.value)} />
                  </label>
                  <label className="wide">
                    <span className="field-caption"><span>Что проверить и сделать после оплаты</span><button type="button" className="copy-button" onClick={() => copyText("instructions", selected.paymentInstructions || "")}><i />{copiedField === "instructions" ? "Скопировано" : "Копировать"}</button></span>
                    <textarea rows={4} value={selected.paymentInstructions || ""} onChange={(e) => updateRecord(selected.id, "paymentInstructions", e.target.value)} />
                  </label>
                </div>
              </section>
            )}

            {(selected.source === "Листинги" || selectedProofs.length > 0 || /опублик/i.test(selected.status)) && (
              <section className="proof-section">
                <div className="proof-head">
                  <div>
                    <span>Подтверждение</span>
                    <h3>Пруф размещения</h3>
                    <p>Скриншоты и прямые ссылки для коллег.</p>
                  </div>
                  <label className="upload-button">
                    {primaryProof ? "Заменить скрин" : "＋ Добавить скрин"}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadProof(file);
                      event.target.value = "";
                    }} />
                  </label>
                </div>
                {proofState && <p className="proof-state">{proofState}</p>}
                {primaryProof ? (
                  <>
                    <article className="proof-primary">
                      <a className="proof-primary-image" href={primaryProof.url} target="_blank" rel="noreferrer">
                        <img src={primaryProof.url} alt={"Подтверждение размещения " + selected.name} />
                      </a>
                      <div className="proof-primary-info">
                        <span className="verified-label">✓ Пруф есть</span>
                        <strong>Проверено {shortDate(primaryProof.createdAt.slice(0, 10))}</strong>
                        <label>Короткая заметка<input value={primaryProof.note} onChange={(event) => updateProof(selected.id, primaryProof.id, event.target.value)} /></label>
                        <div className="proof-primary-actions">
                          <a href={primaryProof.url} download={primaryProof.fileName}>Скачать пруф</a>
                          {primaryProofLink && <a href={primaryProofLink} target="_blank" rel="noreferrer">Открыть публикацию</a>}
                          <button type="button" onClick={() => removeProof(selected.id, primaryProof)}>Удалить</button>
                        </div>
                      </div>
                    </article>
                    {selectedProofs.length > 1 && (
                      <details className="proof-history">
                        <summary>История скриншотов ({selectedProofs.length - 1})</summary>
                        <div>
                          {selectedProofs.slice(0, -1).reverse().map((proof) => (
                            <article key={proof.id}>
                              <img src={proof.url} alt="" />
                              <span>{shortDate(proof.createdAt.slice(0, 10))}</span>
                              <small>{proof.note}</small>
                              <a href={proof.url} target="_blank" rel="noreferrer">Открыть</a>
                              {urlFromText(proof.note) && <a href={urlFromText(proof.note)} target="_blank" rel="noreferrer">Публикация</a>}
                              <button type="button" onClick={() => removeProof(selected.id, proof)}>Удалить</button>
                            </article>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                ) : (
                  <div className="proof-empty">
                    <span>□</span>
                    <div><strong>Пруфа пока нет</strong><p>После публикации добавьте один основной скриншот.</p></div>
                  </div>
                )}
                {/опублик/i.test(selected.status) && !primaryProof && <div className="proof-reminder">Для статуса «Опубликовано» нужно добавить скриншот подтверждения.</div>}
              </section>
            )}

            <section className="renewal-panel">
              <div className="renewal-head">
                <div><span>Размещение</span><h3>Срок и продление</h3></div>
                {!selected.renewalDate && <b>Срок нужно уточнить</b>}
              </div>
              <div className="renewal-grid">
                <label>Дата начала<input type="date" value={selected.placementStart || ""} onChange={(e) => updateRecord(selected.id, "placementStart", e.target.value)} /></label>
                <label>Дата продления<input type="date" value={selected.renewalDate || ""} onChange={(e) => updateRecord(selected.id, "renewalDate", e.target.value)} /></label>
                <label className="wide">Срок размещения<input value={selected.placementTerm || ""} onChange={(e) => updateRecord(selected.id, "placementTerm", e.target.value)} /></label>
                <label className="wide">Условия продления<textarea rows={3} value={selected.renewalNotes || ""} onChange={(e) => updateRecord(selected.id, "renewalNotes", e.target.value)} /></label>
              </div>
            </section>

            <div className="section-title"><span>Основная информация</span></div>
            <div className="form-grid">
              <label>Статус<select value={selected.status} onChange={(e) => updateRecord(selected.id, "status", e.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Дата контроля<input type="date" value={selected.dueDate} onChange={(e) => updateRecord(selected.id, "dueDate", e.target.value)} /></label>
              <label className="wide">Следующее действие<textarea rows={3} value={selected.action} onChange={(e) => updateRecord(selected.id, "action", e.target.value)} /></label>
              <label>Ответственный<input value={selected.owner} onChange={(e) => updateRecord(selected.id, "owner", e.target.value)} /></label>
              <label>Цена / формат<input value={selected.price} onChange={(e) => updateRecord(selected.id, "price", e.target.value)} /></label>
              <label className="wide">Кратко о площадке<textarea rows={3} value={selected.summary} onChange={(e) => updateRecord(selected.id, "summary", e.target.value)} /></label>
              <label className="wide notes-field">
                <span className="field-caption"><span>Заметки и переписка</span><button type="button" className="copy-button" onClick={() => copyText("notes", selected.notes)}><i />{copiedField === "notes" ? "Скопировано" : "Копировать"}</button></span>
                <textarea rows={7} value={selected.notes} onChange={(e) => updateRecord(selected.id, "notes", e.target.value)} />
              </label>
              <label className="wide">Ссылка<input value={selected.link} onChange={(e) => updateRecord(selected.id, "link", e.target.value)} /></label>
            </div>
            <div className="drawer-actions">
              <button className="danger-link" onClick={() => removeRecord(selected.id)}>Удалить</button>
              {selected.link && <a className="button secondary" href={selected.link} target="_blank" rel="noreferrer">Открыть сайт ↗</a>}
              <button className="button primary" onClick={save}>Сохранить изменения</button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default function ListingsCrmBoard() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    setShadowRoot(hostRef.current.shadowRoot || hostRef.current.attachShadow({ mode: "open" }));
  }, []);

  return (
    <div ref={hostRef} className="analytics-listings-crm-host">
      {shadowRoot && createPortal(
        <>
          <style>{crmCss}</style>
          <ListingsCrmWorkspace />
        </>,
        shadowRoot,
      )}
    </div>
  );
}
