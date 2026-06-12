import { useEffect, useMemo, useState } from "react";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const IMAGE_CONTENT_STORAGE_KEY = "atlas.analytics.imageContent.v1";

const defaultImageItems = [
  {
    id: "atlas-transparency-facts",
    title: "Transparency facts",
    russianBrief: "Имиджевая картинка про то, что Atlas показывает не обещания, а проверяемые факты: отчеты, on-chain данные, документы и прозрачность.",
    englishPrompt: "Create a premium Atlas System brand image: bright white Web3 grid, orange Atlas logo in the top-left corner, transparent smart-contract cube, audit report cards, BscScan log, shield check icon, warm orange nodes. Main message: Atlas shows verifiable facts, not promises. Clean fintech style, no people, no dark background.",
    englishHeadline: "Verifiable facts, not promises",
    tag: "Transparency",
    status: "На согласовании",
    imageUrl: "",
  },
  {
    id: "smart-cycle-core",
    title: "Smart Cycle core",
    russianBrief: "Картинка про Smart Cycle как ядро экосистемы: участники, смарт-контракт, автоматические правила и прозрачное движение средств.",
    englishPrompt: "Create an Atlas System image about Smart Cycle as the core protocol: orange smart-contract cube in the center, transparent cycles around it, users represented as clean network nodes, funds moving through automated rules, light white grid, Atlas logo top-left, premium Web3 SaaS look.",
    englishHeadline: "Smart Cycle is the core",
    tag: "Smart Cycle",
    status: "Идея",
    imageUrl: "",
  },
  {
    id: "community-builders",
    title: "Community builders",
    russianBrief: "Имиджевый визуал про то, что Atlas строится сообществом и лидерами, а не одиночками.",
    englishPrompt: "Create a bright Atlas System community builders visual: orange Atlas logo top-left, many clean 3D nodes connected on a white grid, central transparent Atlas cube, builder badges, warm orange paths, sense of global community and leadership. No portraits, use abstract people nodes only.",
    englishHeadline: "Built by communities",
    tag: "Community",
    status: "Идея",
    imageUrl: "",
  },
  {
    id: "audit-risk-disclosed",
    title: "Audit risk disclosed",
    russianBrief: "Картинка для объяснения: риски не прячутся, а раскрываются. Transport, owner powers, hybrid Web3 — честно и спокойно.",
    englishPrompt: "Create a premium disclosure image for Atlas System: white background, orange warning shield, audit report panel, smart-contract cube, transparent trust boundary line, Atlas logo top-left. Message: risks are disclosed, monitored, and explained. Calm professional tone, no fear, no dark UI.",
    englishHeadline: "Risks are disclosed",
    tag: "Audit Risk",
    status: "На согласовании",
    imageUrl: "",
  },
  {
    id: "security-review-progress",
    title: "Security Review progress",
    russianBrief: "Картинка про Security Review in progress: Foundry, Slither, Mythril, Aderyn, ручная проверка, но без заявления Audited.",
    englishPrompt: "Create an Atlas System security review image: bright white workspace, orange document stack, code terminal, shield check, labels for Foundry tests, Slither, Mythril, Aderyn, manual review. Atlas logo top-left. Visual tone: security review in progress, reports available, not audited yet.",
    englishHeadline: "Security Review in progress",
    tag: "Security",
    status: "Идея",
    imageUrl: "",
  },
  {
    id: "hybrid-web3-honest",
    title: "Hybrid Web3",
    russianBrief: "Визуал про честную рамку Hybrid Web3: on-chain слой, off-chain партнерская логика, прозрачные границы доверия.",
    englishPrompt: "Create a clean Atlas System Hybrid Web3 visual: two connected layers, on-chain smart contract layer and off-chain partner logic layer, orange trust boundary line, transparent panels, Atlas logo top-left, premium white/orange Web3 style. Message: honest architecture, clear trust boundaries.",
    englishHeadline: "Hybrid Web3, clearly explained",
    tag: "Architecture",
    status: "Идея",
    imageUrl: "",
  },
  {
    id: "onchain-evidence",
    title: "On-chain evidence",
    russianBrief: "Картинка про проверяемость через блокчейн: BscScan, логи, транзакции, публичные доказательства.",
    englishPrompt: "Create a premium Atlas System on-chain evidence image: BscScan-style transaction log, orange blockchain nodes, smart-contract cube, checkmarks, Atlas logo top-left, white grid, warm orange glow. Message: every important action should be traceable and verifiable.",
    englishHeadline: "On-chain evidence",
    tag: "Blockchain",
    status: "Идея",
    imageUrl: "",
  },
  {
    id: "no-fake-promises",
    title: "No fake promises",
    russianBrief: "Сильный имиджевый пост: Atlas не продает туманные обещания, а показывает правила, документы, риски и ограничения.",
    englishPrompt: "Create a bold Atlas System brand image: white background, orange gradient headline energy, transparent document cards labeled rules, risks, disclosures, reports, smart contract. Atlas logo top-left. Message: no fake promises, only clear rules and verifiable documents.",
    englishHeadline: "No fake promises",
    tag: "Brand",
    status: "На согласовании",
    imageUrl: "",
  },
  {
    id: "ecosystem-products",
    title: "Atlas ecosystem",
    russianBrief: "Картинка про экосистему Atlas: Smart Cycle, Knowledge Hub, P2P, Wallet, Governance, Academy как единая система.",
    englishPrompt: "Create a bright Atlas System ecosystem image: central Atlas cube connected to product cards Smart Cycle, Knowledge Hub, P2P Exchange, Wallet, Governance, Academy. Orange/yellow accents, white 3D grid, Atlas logo top-left, premium SaaS ecosystem feel.",
    englishHeadline: "One ecosystem, many products",
    tag: "Ecosystem",
    status: "Идея",
    imageUrl: "",
  },
  {
    id: "testnet-battle",
    title: "Testnet Battle",
    russianBrief: "Визуал про будущий testnet challenge: сообщество проверяет, команда публикует отчет, ошибки становятся улучшениями.",
    englishPrompt: "Create an Atlas System Testnet Battle image: bright white/orange Web3 testing arena, checklist, bug report cards, smart-contract cube under test, community nodes, final report document, Atlas logo top-left. Message: public testing before stronger trust.",
    englishHeadline: "Public testing builds trust",
    tag: "Testnet",
    status: "Идея",
    imageUrl: "",
  },
];

function normalizeImageItems(items) {
  return Array.isArray(items) && items.length
    ? items.map((item, index) => ({
      id: item.id || `image-${Date.now()}-${index}`,
      title: item.title || "New Atlas image",
      russianBrief: item.russianBrief || "",
      englishPrompt: item.englishPrompt || "",
      englishHeadline: item.englishHeadline || item.title || "Atlas System",
      tag: item.tag || "Atlas",
      status: item.status || "Идея",
      imageUrl: item.imageUrl || "",
    }))
    : defaultImageItems;
}

function readStoredImageItems() {
  if (typeof window === "undefined") return defaultImageItems;
  try {
    const saved = window.localStorage.getItem(IMAGE_CONTENT_STORAGE_KEY);
    return saved ? normalizeImageItems(JSON.parse(saved)) : defaultImageItems;
  } catch {
    return defaultImageItems;
  }
}

function persistImageItems(items) {
  try {
    window.localStorage.setItem(IMAGE_CONTENT_STORAGE_KEY, JSON.stringify(items));
    saveServerContent(IMAGE_CONTENT_STORAGE_KEY, items);
  } catch {
    // Локальное состояние остается рабочим, даже если storage временно недоступен.
  }
}

function escapeSvgText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPreviewSvg(item) {
  const headline = escapeSvgText(item.englishHeadline || item.title);
  const tag = escapeSvgText(item.tag || "Atlas");
  const title = escapeSvgText(item.title || "Atlas image");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="atlasOrange" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ff6b00"/>
      <stop offset="1" stop-color="#ffc229"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#ff7a00" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="1200" height="675" fill="#fffaf4"/>
  <path d="M0 520 C180 460 310 560 520 500 C780 426 930 390 1200 470 L1200 675 L0 675 Z" fill="#fff1df"/>
  <g opacity="0.38" stroke="#ff9d21" stroke-width="1">
    ${Array.from({ length: 12 }).map((_, index) => `<path d="M${index * 110 - 80} 650 L${420 + index * 42} 260"/>`).join("")}
    ${Array.from({ length: 8 }).map((_, index) => `<path d="M40 ${620 - index * 42} L1160 ${630 - index * 30}"/>`).join("")}
  </g>
  <g transform="translate(58 48)">
    <circle cx="18" cy="18" r="9" fill="#ff7a00"/><circle cx="43" cy="18" r="9" fill="#ff9d17"/><circle cx="30" cy="39" r="9" fill="#ffc229"/><circle cx="7" cy="39" r="9" fill="#ff8a00"/>
    <text x="64" y="23" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#ff6b00">ATLAS</text>
    <text x="64" y="48" font-family="Arial, sans-serif" font-size="21" font-weight="800" fill="#ff6b00" letter-spacing="4">SYSTEM</text>
  </g>
  <g transform="translate(70 170)">
    <rect x="0" y="0" width="170" height="42" rx="21" fill="#fff" stroke="#ffd4aa"/>
    <text x="24" y="27" font-family="Arial, sans-serif" font-size="16" font-weight="800" fill="#ff7900">${tag}</text>
    <text x="0" y="112" font-family="Arial, sans-serif" font-size="58" font-weight="950" fill="#241006">${headline}</text>
    <text x="0" y="168" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#66483a">${title}</text>
  </g>
  <g transform="translate(690 138)" filter="url(#shadow)">
    <rect x="92" y="0" width="280" height="280" rx="46" fill="#ffffff" opacity="0.82" stroke="#ffd2a3" stroke-width="2"/>
    <rect x="135" y="48" width="194" height="194" rx="36" fill="url(#atlasOrange)" opacity="0.92"/>
    <text x="205" y="180" font-family="Arial, sans-serif" font-size="110" font-weight="950" fill="#fff">A</text>
    <circle cx="40" cy="250" r="38" fill="#fff" stroke="#ff9620" stroke-width="4"/>
    <circle cx="410" cy="230" r="42" fill="#fff" stroke="#ff9620" stroke-width="4"/>
    <path d="M78 244 L135 210 M330 202 L372 220" stroke="#ff8a00" stroke-width="5" fill="none"/>
  </g>
  <g transform="translate(830 470)">
    <rect x="0" y="0" width="250" height="78" rx="22" fill="#fff" stroke="#ffd1a1"/>
    <text x="25" y="32" font-family="Arial, sans-serif" font-size="15" font-weight="900" fill="#ff7700">IMAGE PROMPT READY</text>
    <text x="25" y="56" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#7b5a45">English generation prompt</text>
  </g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function ImageContentBoard() {
  const [items, setItems] = useState(readStoredImageItems);
  const [selectedId, setSelectedId] = useState(() => readStoredImageItems()[0]?.id || "");
  const selectedItem = items.find((item) => item.id === selectedId) || items[0];

  useEffect(() => {
    let isMounted = true;
    loadServerContent(IMAGE_CONTENT_STORAGE_KEY).then((serverItems) => {
      if (!isMounted || !serverItems) return;
      const normalized = normalizeImageItems(serverItems);
      setItems(normalized);
      setSelectedId((current) => current || normalized[0]?.id || "");
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    approved: items.filter((item) => item.status === "OK").length,
    review: items.filter((item) => item.status === "На согласовании").length,
  }), [items]);

  function updateItem(itemId, patch) {
    setItems((current) => {
      const next = current.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
      persistImageItems(next);
      return next;
    });
  }

  function addItem() {
    const item = {
      id: `atlas-image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: "New Atlas image",
      russianBrief: "Коротко описать на русском, какую имиджевую картинку нужно согласовать.",
      englishPrompt: "Create a premium Atlas System brand image with the Atlas logo in the top-left corner, bright white Web3 grid, orange/yellow accents, clean 3D smart-contract visual, no people, no dark background.",
      englishHeadline: "Atlas System image",
      tag: "Atlas",
      status: "Идея",
      imageUrl: "",
    };
    const next = [item, ...items];
    setItems(next);
    setSelectedId(item.id);
    persistImageItems(next);
  }

  if (!selectedItem) return null;

  const previewSrc = selectedItem.imageUrl || buildPreviewSvg(selectedItem);

  return (
    <section className="analytics-image-board">
      <div className="analytics-surface analytics-image-hero">
        <div>
          <span className="analytics-kicker">Images / картинки</span>
          <h2 className="analytics-agent-template-title">Имиджевые картинки Atlas</h2>
          <p className="analytics-page-subtitle">
            Слева выбираем идею, справа согласуем русский смысл и английский prompt. Превью сделано в едином Atlas-шаблоне: логотип в левом верхнем углу, светлый Web3-grid, orange/yellow акценты.
          </p>
        </div>
        <div className="analytics-image-stats">
          <span><strong>{stats.total}</strong> идей</span>
          <span><strong>{stats.review}</strong> на согласовании</span>
          <span><strong>{stats.approved}</strong> OK</span>
        </div>
      </div>

      <div className="analytics-image-layout">
        <aside className="analytics-surface analytics-image-list">
          <div className="analytics-image-list-head">
            <span>Список</span>
            <button type="button" onClick={addItem}>+ картинка</button>
          </div>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`analytics-image-list-item${selectedItem.id === item.id ? " is-active" : ""}`}
              onClick={() => setSelectedId(item.id)}
            >
              <strong>{item.title}</strong>
              <small>{item.tag} · {item.status}</small>
            </button>
          ))}
        </aside>

        <article className="analytics-surface analytics-image-detail">
          <div className="analytics-image-detail-grid">
            <div className="analytics-image-form">
              <label>
                Название картинки
                <input value={selectedItem.title} onChange={(event) => updateItem(selectedItem.id, { title: event.target.value })} />
              </label>
              <label>
                Русский смысл для согласования
                <textarea value={selectedItem.russianBrief} onChange={(event) => updateItem(selectedItem.id, { russianBrief: event.target.value })} />
              </label>
              <label>
                English prompt for generation
                <textarea value={selectedItem.englishPrompt} onChange={(event) => updateItem(selectedItem.id, { englishPrompt: event.target.value })} />
              </label>
              <div className="analytics-image-row">
                <label>
                  Headline на картинке
                  <input value={selectedItem.englishHeadline} onChange={(event) => updateItem(selectedItem.id, { englishHeadline: event.target.value })} />
                </label>
                <label>
                  Тег
                  <input value={selectedItem.tag} onChange={(event) => updateItem(selectedItem.id, { tag: event.target.value })} />
                </label>
              </div>
              <label>
                Ссылка на финальную картинку, если уже сгенерили
                <input value={selectedItem.imageUrl} onChange={(event) => updateItem(selectedItem.id, { imageUrl: event.target.value })} placeholder="https://..." />
              </label>
              <div className="analytics-image-approval">
                {["Идея", "На согласовании", "OK", "Нужны правки"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={selectedItem.status === status ? "is-active" : ""}
                    onClick={() => updateItem(selectedItem.id, { status })}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="analytics-image-preview-panel">
              <div className="analytics-image-preview-head">
                <span>Превью</span>
                <a href={previewSrc} download={`${selectedItem.id}.svg`}>Скачать</a>
              </div>
              <img className="analytics-image-preview" src={previewSrc} alt={`Превью ${selectedItem.title}`} />
              <div className="analytics-image-template-note">
                <strong>Шаблон:</strong> Atlas logo top-left · bright white Web3 grid · orange smart-contract cube · no dark UI · no people portraits.
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default ImageContentBoard;
