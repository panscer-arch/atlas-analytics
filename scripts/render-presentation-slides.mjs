import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = "/Users/digitex/Desktop/Проект2/atlas-analytics-repo";
const logo = "/Users/digitex/Desktop/Проект2/outputs/atlas-slide-prototypes/slide-01/atlas-logo-clean.png";

const slides = [
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-01.png"),
    background: "/Users/digitex/.codex/generated_images/019e6924-923d-7c81-a28c-aac4ab175763/ig_0cc7dbb9b1f0e06e016a1911d7d6d08191b95040b04c4ac28f.png",
    title: "Atlas System",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "Цифровая система взаимопомощи",
    body: "Люди <strong>добровольно</strong> объединяют средства,<br />а правила распределения заранее записаны в<br /><strong>smart-contract</strong>.",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-02.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-02-raw.png"),
    title: "Как это<br />работает",
    titleStyle: "font-size: 78px; line-height: 0.96;",
    headline: "Кошелёк → smart-contract →<br />прозрачное распределение",
    body: "Участник подключает цифровой кошелёк.<br />Smart-contract хранит правила и автоматически<br />выполняет распределение по логике системы.",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-03.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-03-raw.png"),
    title: "Почему это<br />прозрачно",
    titleStyle: "font-size: 78px; line-height: 0.96;",
    headline: "Правила записаны заранее,<br />действия видны в блокчейне",
    body: "Ключевые операции фиксируются on-chain.<br />Участник видит статус цикла, историю<br />действий и условия smart-contract.",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-04.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-04-raw.png"),
    title: "Smart Cycle",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "Базовый цикл участия<br />в Atlas System",
    body: "Участник выбирает формат цикла,<br />оказывает добровольную помощь и видит<br />этапы работы в системе.",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-05.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-05-raw.png"),
    title: "Форматы участия",
    titleStyle: "font-size: 66px; line-height: 1; white-space: nowrap;",
    headline: "Каждый выбирает цикл<br />под свой уровень готовности",
    body: "В системе есть разные форматы участия:<br />от короткого теста до более длительных<br />циклов. Пользователь выбирает сам.",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-06.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-06-raw.png"),
    title: "Lockup Flow",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "Тарифы с фиксированным<br />lockup-периодом",
    body: "Участник выбирает тариф, отправляет<br />добровольную помощь в smart-contract<br />и ждёт завершения выбранного срока.",
    tariffGrid: [
      ["Contract test", "10 минут", "возврат"],
      ["Launch", "1 день", "дельта +0.3%"],
      ["Momentum", "5 дней", "дельта +2%"],
      ["Premiere", "10 дней", "дельта +5%"],
      ["President", "20 дней", "дельта +12%"],
      ["Imperium", "30 дней", "дельта +22.5%"],
    ],
    note: "Lockup Flow от $10",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-07.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-07-raw.png"),
    title: "Daily Flow",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "Долгий цикл<br />с дневной логикой",
    body: "Формат рассчитан на 200 дней.<br />Участник выбирает Core или Elite<br />в зависимости от суммы участия.",
    dailyCards: [
      ["Core", "200 дней", "$10–$2.000", "+120%", "0.6% в сутки"],
      ["Elite", "200 дней", "свыше $2.000", "+160%", "0.8% в сутки"],
    ],
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-08.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-08-raw.png"),
    title: "Финансовые<br />возможности",
    titleStyle: "font-size: 66px; line-height: 0.98;",
    headline: "Пример расчёта<br />по выбранному циклу",
    body: "Таблица показывает ориентировочный<br />сценарий роста. Результат зависит<br />от правил и ликвидности системы.",
    financeRows: [
      ["1 месяц", "$1.202,50"],
      ["2 месяц", "$1.446,01"],
      ["3 месяц", "$1.738,82"],
      ["4 месяц", "$2.090,93"],
      ["5 месяц", "$2.514,35"],
      ["6 месяц", "$3.023,50"],
      ["7 месяц", "$3.635,76"],
      ["8 месяц", "$4.372,01"],
      ["9 месяц", "$5.257,34"],
      ["10 месяц", "$6.321,95"],
      ["11 месяц", "$7.602,14"],
      ["12 месяц", "$9.141,57"],
    ],
    financeTotal: "Итого через 12 мес. ≈ $9.142",
    financeBadge: "814% годовых",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-09.png"),
    background: path.join(root, "public/generated/atlas-presentation-slide-09-raw.png"),
    title: "Предупреждение<br />о рисках",
    titleStyle: "font-size: 60px; line-height: 0.98;",
    headline: "Участие добровольное,<br />результат не гарантирован",
    body: "Запросы выполняются только по правилам<br />smart-contract и при наличии достаточной<br />ликвидности в системе.",
    riskCards: [
      ["Добровольно", "Участник принимает решение самостоятельно"],
      ["Без гарантий", "Добавочная помощь не является обещанным доходом"],
      ["По правилам", "Логика выполнения заранее задана в smart-contract"],
      ["Ликвидность", "Запрос возможен при наличии средств в системе"],
    ],
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-10.png"),
    background: null,
    title: "Как начать",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "Пять шагов<br />для первого участия",
    body: "Маршрут простой: подготовить кошелёк,<br />подключиться к системе, выбрать цикл<br />и отслеживать статус.",
    steps: [
      ["01", "Установить Web3-кошелёк", "MetaMask, Trust Wallet или другой совместимый кошелёк"],
      ["02", "Пополнить USDT BEP-20", "Подготовить сумму участия и небольшую комиссию сети"],
      ["03", "Подключить кошелёк", "Connect wallet на сайте Atlas System"],
      ["04", "Выбрать цикл", "Открыть подходящий формат участия"],
      ["05", "Отправить помощь", "Подтвердить действие и отслеживать статус цикла"],
    ],
  },
];

function dataUrl(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/svg+xml";
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function htmlFor(slide) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1280px;
      height: 720px;
      overflow: hidden;
      background: #111;
      font-family: Inter, Aptos, Arial, sans-serif;
    }
    .slide {
      position: relative;
      width: 1280px;
      height: 720px;
      overflow: hidden;
      background: #fff1e5;
      color: #241006;
    }
    .visual {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 39%, rgba(0,0,0,0.26) 47%, #000 61%, #000 100%);
      mask-image: linear-gradient(90deg, transparent 0%, transparent 39%, rgba(0,0,0,0.26) 47%, #000 61%, #000 100%);
    }
    .fallback-visual {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 82% 16%, rgba(255, 199, 111, 0.46), transparent 34%),
        radial-gradient(circle at 80% 78%, rgba(255, 116, 31, 0.18), transparent 34%),
        linear-gradient(90deg, #fff7ef 0%, #fff1e5 47%, #ffd7a9 100%);
    }
    .fallback-visual::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, transparent 0 43%, rgba(255,255,255,0.1) 43% 100%),
        repeating-linear-gradient(135deg, rgba(255, 149, 49, 0.10) 0 1px, transparent 1px 38px);
      opacity: 0.56;
    }
    .veil {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.90) 0%, rgba(255,250,244,0.72) 30%, rgba(255,246,235,0.20) 53%, rgba(255,244,226,0.00) 100%),
        radial-gradient(circle at 15% 18%, rgba(255,255,255,0.68), transparent 30%);
      pointer-events: none;
    }
    .logo {
      position: absolute;
      left: 70px;
      top: 50px;
      width: 178px;
      height: auto;
      filter: drop-shadow(0 12px 24px rgba(100, 42, 0, 0.08));
    }
    .copy {
      position: absolute;
      left: 70px;
      top: 178px;
      width: 580px;
    }
    h1 {
      margin: 0;
      font-size: 94px;
      line-height: 0.93;
      letter-spacing: -1px;
      font-weight: 900;
      color: #250d04;
      text-shadow: 0 18px 42px rgba(55, 19, 0, 0.08);
    }
    .headline {
      margin-top: 36px;
      font-size: 32px;
      line-height: 1.15;
      font-weight: 850;
      color: #8d3514;
    }
    .rule {
      width: 88px;
      height: 3px;
      margin-top: 28px;
      border-radius: 999px;
      background: linear-gradient(90deg, #ff5a1f, rgba(255, 147, 0, 0.18));
    }
    .body {
      margin-top: 30px;
      width: 540px;
      font-size: 24px;
      line-height: 1.38;
      color: #4c3126;
    }
    .body strong {
      color: #c94312;
      font-weight: 900;
    }
    .domain {
      position: absolute;
      left: 70px;
      bottom: 48px;
      height: 42px;
      padding: 0 22px 0 18px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(255, 100, 28, 0.45);
      color: #ff5a1f;
      font-size: 18px;
      font-weight: 850;
      letter-spacing: 0.01em;
      box-shadow: 0 18px 38px rgba(126, 62, 0, 0.10);
    }
    .domain::before {
      content: "↗";
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(255, 90, 31, 0.10);
      border: 1px solid rgba(255, 90, 31, 0.35);
      color: #ff5a1f;
      font-size: 14px;
      font-weight: 900;
    }
    .tariff-grid {
      position: absolute;
      left: 588px;
      top: 138px;
      width: 610px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .tariff-card {
      min-height: 126px;
      padding: 18px 16px 16px;
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,248,238,0.64));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 22px 44px rgba(126, 62, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .tariff-card strong {
      display: block;
      color: #250d04;
      font-size: 23px;
      line-height: 1.1;
      font-weight: 900;
    }
    .tariff-card span {
      display: inline-flex;
      margin-top: 13px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 90, 31, 0.11);
      color: #a33d15;
      font-size: 17px;
      font-weight: 850;
    }
    .tariff-card small {
      display: block;
      margin-top: 10px;
      color: #6b4434;
      font-size: 17px;
      line-height: 1.25;
      font-weight: 760;
    }
    .slide-note {
      position: absolute;
      left: 588px;
      top: 548px;
      width: 610px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: rgba(255,255,255,0.72);
      border: 1px solid rgba(255, 100, 28, 0.34);
      color: #ff5a1f;
      font-size: 22px;
      font-weight: 900;
      box-shadow: 0 18px 38px rgba(126, 62, 0, 0.10);
    }
    .daily-grid {
      position: absolute;
      left: 626px;
      top: 140px;
      width: 520px;
      display: grid;
      gap: 22px;
    }
    .daily-card {
      min-height: 178px;
      padding: 24px 26px;
      border-radius: 28px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,248,238,0.68));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 24px 48px rgba(126, 62, 0, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .daily-card h2 {
      margin: 0 0 16px;
      color: #250d04;
      font-size: 36px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: -0.4px;
    }
    .daily-card ul {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .daily-card li {
      min-height: 38px;
      display: flex;
      align-items: center;
      padding: 7px 11px;
      border-radius: 999px;
      background: rgba(255, 90, 31, 0.10);
      color: #6b4434;
      font-size: 17px;
      font-weight: 820;
      line-height: 1.2;
    }
    .daily-card li:last-child {
      grid-column: 1 / -1;
      justify-content: center;
      background: #ff5a1f;
      color: #fff;
      font-size: 19px;
      font-weight: 900;
    }
    .finance-panel {
      position: absolute;
      left: 640px;
      top: 100px;
      width: 500px;
      padding: 20px;
      border-radius: 30px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,248,238,0.66));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 26px 52px rgba(126, 62, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(11px);
    }
    .finance-panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
    }
    .finance-panel-head strong {
      color: #250d04;
      font-size: 26px;
      font-weight: 900;
      line-height: 1;
    }
    .finance-panel-head span {
      flex: 0 0 auto;
      padding: 8px 12px;
      border-radius: 999px;
      background: #ff5a1f;
      color: #fff;
      font-size: 18px;
      font-weight: 900;
    }
    .finance-table {
      display: grid;
      gap: 7px;
    }
    .finance-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 30px;
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid rgba(255, 145, 40, 0.18);
      background: rgba(255, 255, 255, 0.54);
    }
    .finance-row span {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4c3126;
      font-size: 16px;
      font-weight: 820;
    }
    .finance-row span + span {
      border-left: 1px solid rgba(126, 62, 0, 0.11);
      color: #250d04;
      font-weight: 900;
    }
    .finance-total {
      margin-top: 12px;
      min-height: 42px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: linear-gradient(90deg, #ff8a00, #ff5a1f);
      color: #fff;
      font-size: 20px;
      font-weight: 900;
      box-shadow: 0 16px 32px rgba(255, 90, 31, 0.22);
    }
    .risk-grid {
      position: absolute;
      left: 626px;
      top: 132px;
      width: 530px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .risk-card {
      min-height: 176px;
      padding: 24px 22px;
      border-radius: 28px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,248,238,0.68));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 24px 48px rgba(126, 62, 0, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .risk-card span {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      margin-bottom: 16px;
      border-radius: 14px;
      background: rgba(255, 90, 31, 0.13);
      color: #ff5a1f;
      font-size: 24px;
      font-weight: 900;
    }
    .risk-card strong {
      display: block;
      color: #250d04;
      font-size: 25px;
      line-height: 1.1;
      font-weight: 900;
    }
    .risk-card p {
      margin: 12px 0 0;
      color: #6b4434;
      font-size: 17px;
      line-height: 1.35;
      font-weight: 760;
    }
    .steps-grid {
      position: absolute;
      left: 610px;
      top: 112px;
      width: 560px;
      display: grid;
      gap: 14px;
    }
    .step-card {
      display: grid;
      grid-template-columns: 58px minmax(0, 1fr);
      gap: 16px;
      align-items: center;
      min-height: 86px;
      padding: 16px 20px;
      border-radius: 24px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,248,238,0.66));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 20px 40px rgba(126, 62, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .step-card span {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(180deg, #ff8a00, #ff5a1f);
      color: #fff;
      font-size: 20px;
      font-weight: 950;
      box-shadow: 0 12px 24px rgba(255, 90, 31, 0.22);
    }
    .step-card strong {
      display: block;
      color: #250d04;
      font-size: 23px;
      line-height: 1.1;
      font-weight: 900;
    }
    .step-card p {
      margin: 7px 0 0;
      color: #6b4434;
      font-size: 16px;
      line-height: 1.28;
      font-weight: 760;
    }
  </style>
</head>
<body>
  <main class="slide">
    ${slide.background ? `<img class="visual" src="${dataUrl(slide.background)}" alt="" />` : `<div class="fallback-visual"></div>`}
    <div class="veil"></div>
    <img class="logo" src="${dataUrl(logo)}" alt="Atlas System" />
    <section class="copy">
      <h1 style="${slide.titleStyle || ""}">${slide.title}</h1>
      <div class="headline">${slide.headline}</div>
      <div class="rule"></div>
      <div class="body">${slide.body}</div>
    </section>
    ${slide.tariffGrid ? `<section class="tariff-grid">${slide.tariffGrid.map(([name, days, delta]) => `<div class="tariff-card"><strong>${name}</strong><span>${days}</span><small>${delta}</small></div>`).join("")}</section>` : ""}
    ${slide.dailyCards ? `<section class="daily-grid">${slide.dailyCards.map(([name, term, amount, total, daily]) => `<div class="daily-card"><h2>${name}</h2><ul><li>${term}</li><li>${amount}</li><li>${total}</li><li>${daily}</li></ul></div>`).join("")}</section>` : ""}
    ${slide.financeRows ? `<section class="finance-panel"><div class="finance-panel-head"><strong>Пример сценария</strong><span>${slide.financeBadge}</span></div><div class="finance-table">${slide.financeRows.map(([month, value]) => `<div class="finance-row"><span>${month}</span><span>${value}</span></div>`).join("")}</div><div class="finance-total">${slide.financeTotal}</div></section>` : ""}
    ${slide.riskCards ? `<section class="risk-grid">${slide.riskCards.map(([title, text], index) => `<div class="risk-card"><span>${index + 1}</span><strong>${title}</strong><p>${text}</p></div>`).join("")}</section>` : ""}
    ${slide.steps ? `<section class="steps-grid">${slide.steps.map(([number, title, text]) => `<div class="step-card"><span>${number}</span><div><strong>${title}</strong><p>${text}</p></div></div>`).join("")}</section>` : ""}
    ${slide.note ? `<div class="slide-note">${slide.note}</div>` : ""}
    <div class="domain">atlas-system.io</div>
  </main>
</body>
</html>`;
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Users/digitex/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell",
});

for (const slide of slides) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.setContent(htmlFor(slide), { waitUntil: "load" });
  await page.screenshot({ path: slide.output, fullPage: false });
  await page.close();
}

await browser.close();
