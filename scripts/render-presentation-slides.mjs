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
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-11.png"),
    background: null,
    title: "Партнёрская<br />программа",
    titleStyle: "font-size: 64px; line-height: 0.98;",
    headline: "Статусы, структура<br />и бонусная логика",
    body: "Программа строится на личном объёме,<br />объёме первой линии и развитии структуры.<br />Условия зависят от статуса участника.",
    partnerGroups: [
      ["Builders", "Строим фундамент", "$50–$1.000", "18–36%"],
      ["Masters", "Управляем ростом", "$1.500–$7.000", "38–50%"],
      ["Elite", "Стратегия и влияние", "$8.000–$15.000", "52.5–60%"],
    ],
    partnerStats: [
      ["1-я линия", "до $150.000"],
      ["Глубина", "до $1.500.000"],
      ["Матчинг", "до 25%"],
    ],
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-12.png"),
    background: null,
    title: "Экосистема<br />Atlas",
    titleStyle: "font-size: 72px; line-height: 0.96;",
    headline: "Не один продукт,<br />а экосистема<br />вокруг пользователя",
    body: "Atlas System развивается поэтапно:<br />циклы, база знаний, обучение,<br />партнёрские инструменты и DAO.",
    productCards: [
      ["Smart Cycle 1", "доступно на старте", "Первый пилотный финансовый продукт и ядро экосистемы Atlas System."],
      ["Invite & Earn", "доступно на старте", "Партнёрская программа для роста команды и развития структуры."],
      ["Knowledge Hub", "доступно на старте", "База знаний: термины, FAQ, материалы и логика работы системы."],
      ["Atlas Academy", "Q1 2027", "Обучение финансовой грамотности, Web3 и командообразованию."],
      ["P2P Exchange", "Q4 2026", "Платформа прямых сделок между пользователями Atlas System."],
      ["Governance", "Q4 2026", "Инструменты децентрализованного управления экосистемой."],
    ],
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-13.png"),
    background: null,
    title: "Архитектура<br />и управление",
    titleStyle: "font-size: 66px; line-height: 0.96;",
    headline: "Техническая основа,<br />безопасность и DAO-логика",
    body: "Система развивается командой Web3.<br />Ключевая логика закрепляется в коде,<br />а управление постепенно переходит<br />к прозрачным процедурам.",
    architectureCards: [
      ["Безопасность", "Аудит smart-contract, bug bounty и постоянный мониторинг системы."],
      ["Инфраструктура", "Устойчивые узлы, масштабируемые сервисы и резервирование."],
      ["Разработка", "Открытые стандарты, модульная архитектура и улучшение продукта."],
      ["DAO-управление", "Прозрачные on-chain процедуры, голосования и распределение ресурсов."],
    ],
    architectureNote: "Проект работает по модели Hybrid DAO: код задаёт правила, а ключевые решения постепенно переходят в on-chain механику.",
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-14.png"),
    background: null,
    title: "Для кого<br />Atlas System",
    titleStyle: "font-size: 68px; line-height: 0.96;",
    headline: "Для людей, которым важны<br />понятные правила",
    body: "Система подходит тем, кто хочет<br />разобраться в цифровой взаимопомощи,<br />видеть условия заранее и принимать<br />решение осознанно.",
    audienceCards: [
      ["Новичок", "Можно начать с базовых понятий: кошелёк, цикл, smart-contract и статус участия."],
      ["Web3-пользователь", "Привычная логика подключения кошелька и проверки действий в блокчейне."],
      ["Партнёр", "Понятная система статусов, роста команды и бонусов по правилам программы."],
      ["Лидер команды", "Материалы, структура и дорожная карта для долгосрочного развития сообщества."],
    ],
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-15.png"),
    background: null,
    title: "Главная<br />идея",
    titleStyle: "font-size: 78px; line-height: 0.96;",
    headline: "От закрытых обещаний<br />к прозрачной<br />цифровой системе",
    body: "Добровольное участие, smart-contract<br />и on-chain прозрачность.",
    ideaCards: [
      ["Понятно", "Новичок видит не набор сложных терминов, а простую механику участия."],
      ["Прозрачно", "Правила заранее записаны в коде, а ключевые действия фиксируются в блокчейне."],
      ["Добровольно", "Участник сам выбирает формат, сумму и момент входа в систему."],
      ["Долгосрочно", "Atlas развивается как экосистема, а не как один временный продукт."],
    ],
  },
  {
    output: path.join(root, "public/generated/atlas-presentation-slide-16.png"),
    background: null,
    title: "Присоединяйтесь",
    titleStyle: "font-size: 54px; line-height: 1; white-space: nowrap;",
    headline: "к Atlas System<br />осознанно",
    body: "Начните с материалов, проверьте условия,<br />разберитесь в механике циклов и только<br />после этого подключайтесь к системе.",
    finalCta: {
      label: "Официальный сайт",
      url: "atlas-system.io",
      note: "Изучить материалы, проверить условия и подключиться",
    },
  },
];

const zhOverrides = [
  {
    title: "Atlas System",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "数字互助系统",
    body: "人们在<strong>自愿</strong>基础上汇集资金，<br />分配规则提前写入<br /><strong>智能合约</strong>。",
  },
  {
    title: "它如何<br />运作",
    titleStyle: "font-size: 78px; line-height: 0.96;",
    headline: "钱包 → 智能合约 →<br />透明分配",
    body: "参与者连接数字钱包。<br />智能合约保存规则，并按系统逻辑<br />自动执行分配。",
  },
  {
    title: "为什么<br />透明",
    titleStyle: "font-size: 78px; line-height: 0.96;",
    headline: "规则提前写入，<br />关键操作可在链上查看",
    body: "关键流程记录在区块链上。<br />参与者可以查看周期状态、操作历史<br />和智能合约条件。",
  },
  {
    title: "Smart Cycle",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "Atlas System 的<br />基础参与周期",
    body: "参与者选择周期形式，<br />提供自愿帮助，并查看系统中的<br />执行阶段。",
  },
  {
    title: "参与形式",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "根据自己的准备程度<br />选择周期",
    body: "系统提供多种参与形式：<br />从短期测试到更长周期。<br />选择权始终在用户手中。",
  },
  {
    title: "Lockup Flow",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "固定锁定期<br />参与方案",
    body: "参与者选择方案，将自愿帮助<br />发送到智能合约，并等待<br />所选期限结束。",
    tariffGrid: [
      ["Contract test", "10 分钟", "返还"],
      ["Launch", "1 天", "增量 +0.3%"],
      ["Momentum", "5 天", "增量 +2%"],
      ["Premiere", "10 天", "增量 +5%"],
      ["President", "20 天", "增量 +12%"],
      ["Imperium", "30 天", "增量 +22.5%"],
    ],
    note: "Lockup Flow 起步 $10",
  },
  {
    title: "Daily Flow",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "带有每日逻辑的<br />长期周期",
    body: "该形式设计为 200 天。<br />参与者根据参与金额<br />选择 Core 或 Elite。",
    dailyCards: [
      ["Core", "200 天", "$10–$2,000", "+120%", "每日 0.6%"],
      ["Elite", "200 天", "超过 $2,000", "+160%", "每日 0.8%"],
    ],
  },
  {
    title: "财务机会",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "所选周期的<br />示例计算",
    body: "表格展示一个参考增长情景。<br />结果取决于系统规则<br />和可用流动性。",
    financeRows: [
      ["第 1 个月", "$1,202.50"],
      ["第 2 个月", "$1,446.01"],
      ["第 3 个月", "$1,738.82"],
      ["第 4 个月", "$2,090.93"],
      ["第 5 个月", "$2,514.35"],
      ["第 6 个月", "$3,023.50"],
      ["第 7 个月", "$3,635.76"],
      ["第 8 个月", "$4,372.01"],
      ["第 9 个月", "$5,257.34"],
      ["第 10 个月", "$6,321.95"],
      ["第 11 个月", "$7,602.14"],
      ["第 12 个月", "$9,141.57"],
    ],
    financeTitle: "示例情景",
    financeTotal: "12 个月后约 $9,142",
    financeBadge: "年化 814%",
  },
  {
    title: "风险提示",
    titleStyle: "font-size: 78px; line-height: 0.98;",
    headline: "参与是自愿的，<br />结果不作保证",
    body: "请求只会根据智能合约规则<br />并在系统具备足够流动性时执行。",
    riskCards: [
      ["自愿参与", "参与者独立作出决定"],
      ["无保证", "额外帮助不是承诺收益"],
      ["按规则", "执行逻辑提前写入智能合约"],
      ["流动性", "请求取决于系统中的可用资金"],
    ],
  },
  {
    title: "如何开始",
    titleStyle: "font-size: 72px; line-height: 1; white-space: nowrap;",
    headline: "首次参与的<br />五个步骤",
    body: "路径很简单：准备钱包，<br />连接系统，选择周期，<br />并跟踪状态。",
    steps: [
      ["01", "安装 Web3 钱包", "MetaMask、Trust Wallet 或其他兼容钱包"],
      ["02", "充值 USDT BEP-20", "准备参与金额和少量网络手续费"],
      ["03", "连接钱包", "在 Atlas System 网站点击 Connect wallet"],
      ["04", "选择周期", "打开适合自己的参与形式"],
      ["05", "发送帮助", "确认操作并跟踪周期状态"],
    ],
  },
  {
    title: "伙伴计划",
    titleStyle: "font-size: 78px; line-height: 1; white-space: nowrap;",
    headline: "等级、结构<br />和奖金逻辑",
    body: "计划基于个人量、第一线量<br />和团队结构发展。<br />条件取决于参与者等级。",
    partnerGroups: [
      ["Builders", "建立基础", "$50–$1,000", "18–36%"],
      ["Masters", "管理增长", "$1,500–$7,000", "38–50%"],
      ["Elite", "战略与影响力", "$8,000–$15,000", "52.5–60%"],
    ],
    partnerVolumeLabel: "个人活跃量",
    partnerStats: [
      ["第一线", "最高 $150,000"],
      ["深度结构", "最高 $1,500,000"],
      ["匹配奖金", "最高 25%"],
    ],
  },
  {
    title: "Atlas<br />生态系统",
    titleStyle: "font-size: 72px; line-height: 0.96;",
    headline: "不是单一产品，<br />而是围绕用户的生态",
    body: "Atlas System 分阶段发展：<br />周期、知识库、培训、<br />伙伴工具和 DAO。",
    productCards: [
      ["Smart Cycle 1", "启动时可用", "首个试点金融产品，也是 Atlas System 生态的核心。"],
      ["Invite & Earn", "启动时可用", "用于团队增长和结构发展的伙伴计划。"],
      ["Knowledge Hub", "启动时可用", "知识库：术语、FAQ、材料和系统逻辑。"],
      ["Atlas Academy", "2027 Q1", "金融素养、Web3 和团队建设培训。"],
      ["P2P Exchange", "2026 Q4", "Atlas System 用户之间的直接交易平台。"],
      ["Governance", "2026 Q4", "生态系统去中心化治理工具。"],
    ],
  },
  {
    title: "架构<br />与治理",
    titleStyle: "font-size: 78px; line-height: 0.96;",
    headline: "技术基础、<br />安全和 DAO 逻辑",
    body: "系统由 Web3 团队开发。<br />关键逻辑写入代码，治理逐步<br />走向透明流程。",
    architectureCards: [
      ["安全", "智能合约审计、bug bounty 和持续系统监控。"],
      ["基础设施", "稳定节点、可扩展服务和备份机制。"],
      ["开发", "开放标准、模块化架构和产品持续改进。"],
      ["DAO 治理", "透明的链上流程、投票和资源分配。"],
    ],
    architectureNote: "项目采用 Hybrid DAO 模型：代码设定规则，关键决策逐步转向链上机制。",
  },
  {
    title: "Atlas System<br />适合谁",
    titleStyle: "font-size: 66px; line-height: 0.98;",
    headline: "适合重视<br />清晰规则的人",
    body: "适合希望理解数字互助、<br />提前看到条件并理性决策的人。",
    audienceCards: [
      ["新手", "可以从钱包、周期、智能合约和参与状态等基础概念开始。"],
      ["Web3 用户", "熟悉的钱包连接逻辑，以及在区块链上核验操作。"],
      ["伙伴", "清晰的等级体系、团队增长和规则化奖金逻辑。"],
      ["团队领导", "用于长期社区发展的材料、结构和路线图。"],
    ],
  },
  {
    title: "核心理念",
    titleStyle: "font-size: 78px; line-height: 1; white-space: nowrap;",
    headline: "从封闭承诺<br />到透明数字系统",
    body: "自愿参与、智能合约<br />和链上透明。",
    ideaCards: [
      ["易懂", "新手看到的不是复杂术语，而是简单的参与机制。"],
      ["透明", "规则提前写入代码，关键操作记录在区块链上。"],
      ["自愿", "参与者自行选择形式、金额和进入时机。"],
      ["长期", "Atlas 发展为生态系统，而不是一次性产品。"],
    ],
  },
  {
    title: "加入 Atlas System",
    titleStyle: "font-size: 58px; line-height: 1; white-space: nowrap;",
    headline: "先理解，<br />再参与",
    body: "从材料开始，检查条件，<br />理解周期机制，然后再连接系统。",
    finalCta: {
      label: "官方网站",
      url: "atlas-system.io",
      note: "查看材料、核验条件并连接系统",
    },
  },
];

const selectedSlides = process.argv.includes("--zh")
  ? slides.map((slide, index) => ({
      ...slide,
      ...zhOverrides[index],
      output: path.join(root, `public/generated/atlas-presentation-zh-slide-${String(index + 1).padStart(2, "0")}.png`),
    }))
  : slides;

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
      font-family: Inter, Aptos, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
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
    .partner-groups {
      position: absolute;
      left: 604px;
      top: 126px;
      width: 560px;
      display: grid;
      gap: 16px;
    }
    .partner-group-card {
      min-height: 122px;
      padding: 20px 22px;
      border-radius: 26px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,248,238,0.68));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 22px 44px rgba(126, 62, 0, 0.13),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .partner-group-card header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 12px;
    }
    .partner-group-card strong {
      display: block;
      color: #250d04;
      font-size: 30px;
      line-height: 1;
      font-weight: 900;
    }
    .partner-group-card em {
      display: block;
      margin-top: 6px;
      color: #8d3514;
      font-size: 16px;
      font-style: normal;
      font-weight: 820;
    }
    .partner-group-card span {
      flex: 0 0 auto;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 90, 31, 0.12);
      color: #a33d15;
      font-size: 17px;
      font-weight: 900;
    }
    .partner-group-card p {
      margin: 0;
      color: #4c3126;
      font-size: 18px;
      line-height: 1.25;
      font-weight: 820;
    }
    .partner-stats {
      position: absolute;
      left: 604px;
      top: 548px;
      width: 560px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .partner-stat {
      min-height: 70px;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 10px;
      border-radius: 18px;
      background: linear-gradient(180deg, #ff8a00, #ff5a1f);
      color: #fff;
      box-shadow: 0 16px 32px rgba(255, 90, 31, 0.22);
    }
    .partner-stat small {
      display: block;
      font-size: 14px;
      font-weight: 800;
      opacity: 0.88;
    }
    .partner-stat strong {
      display: block;
      margin-top: 4px;
      font-size: 20px;
      font-weight: 950;
    }
    .product-grid {
      position: absolute;
      left: 590px;
      top: 120px;
      width: 600px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .product-card {
      min-height: 138px;
      padding: 20px 20px 18px;
      border-radius: 26px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,248,238,0.68));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 22px 44px rgba(126, 62, 0, 0.13),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .product-card header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 13px;
    }
    .product-card strong {
      display: block;
      max-width: 182px;
      color: #250d04;
      font-size: 24px;
      line-height: 1.04;
      font-weight: 940;
    }
    .product-card span {
      flex: 0 0 auto;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255, 90, 31, 0.12);
      color: #a33d15;
      font-size: 13px;
      line-height: 1;
      font-weight: 900;
      white-space: nowrap;
    }
    .product-card p {
      margin: 0;
      color: #5a392b;
      font-size: 16px;
      line-height: 1.34;
      font-weight: 760;
    }
    .architecture-grid {
      position: absolute;
      left: 590px;
      top: 124px;
      width: 600px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .architecture-card {
      min-height: 172px;
      padding: 22px 22px 20px;
      border-radius: 28px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,248,238,0.66));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 22px 44px rgba(126, 62, 0, 0.13),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .architecture-card span {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      margin-bottom: 18px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(255, 138, 0, 0.22), rgba(255, 90, 31, 0.14));
      color: #ff5a1f;
      font-size: 22px;
      font-weight: 950;
    }
    .architecture-card strong {
      display: block;
      color: #250d04;
      font-size: 25px;
      line-height: 1.06;
      font-weight: 930;
    }
    .architecture-card p {
      margin: 11px 0 0;
      color: #5a392b;
      font-size: 16px;
      line-height: 1.32;
      font-weight: 760;
    }
    .architecture-note {
      position: absolute;
      left: 590px;
      top: 548px;
      width: 600px;
      min-height: 74px;
      display: flex;
      align-items: center;
      padding: 16px 22px;
      border-radius: 22px;
      background: rgba(255, 90, 31, 0.12);
      color: #6b2a12;
      border: 1px solid rgba(255, 90, 31, 0.2);
      font-size: 17px;
      line-height: 1.32;
      font-weight: 850;
    }
    .audience-grid {
      position: absolute;
      left: 590px;
      top: 128px;
      width: 600px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .audience-card {
      min-height: 204px;
      padding: 24px 24px 22px;
      border-radius: 30px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.89), rgba(255,248,238,0.67));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 24px 48px rgba(126, 62, 0, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .audience-card span {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      margin-bottom: 22px;
      border-radius: 50%;
      background: linear-gradient(180deg, #ff8a00, #ff5a1f);
      color: #fff;
      font-size: 20px;
      font-weight: 950;
      box-shadow: 0 14px 28px rgba(255, 90, 31, 0.2);
    }
    .audience-card strong {
      display: block;
      color: #250d04;
      font-size: 28px;
      line-height: 1.04;
      font-weight: 930;
    }
    .audience-card p {
      margin: 13px 0 0;
      color: #5a392b;
      font-size: 17px;
      line-height: 1.34;
      font-weight: 760;
    }
    .idea-grid {
      position: absolute;
      left: 590px;
      top: 128px;
      width: 600px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .idea-card {
      min-height: 204px;
      padding: 24px 24px 22px;
      border-radius: 30px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.89), rgba(255,248,238,0.67));
      border: 1px solid rgba(255, 145, 40, 0.28);
      box-shadow:
        0 24px 48px rgba(126, 62, 0, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(10px);
    }
    .idea-card span {
      display: inline-flex;
      align-items: center;
      height: 34px;
      padding: 0 13px;
      margin-bottom: 28px;
      border-radius: 999px;
      background: rgba(255, 90, 31, 0.12);
      color: #a33d15;
      font-size: 15px;
      font-weight: 900;
    }
    .idea-card strong {
      display: block;
      color: #250d04;
      font-size: 30px;
      line-height: 1.04;
      font-weight: 940;
    }
    .idea-card p {
      margin: 13px 0 0;
      color: #5a392b;
      font-size: 17px;
      line-height: 1.34;
      font-weight: 760;
    }
    .final-panel {
      position: absolute;
      left: 585px;
      top: 138px;
      width: 604px;
      min-height: 432px;
      padding: 44px;
      border-radius: 38px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,248,238,0.68));
      border: 1px solid rgba(255, 145, 40, 0.3);
      box-shadow:
        0 30px 64px rgba(126, 62, 0, 0.16),
        inset 0 1px 0 rgba(255, 255, 255, 0.84);
      backdrop-filter: blur(10px);
    }
    .final-panel small {
      display: inline-flex;
      height: 34px;
      align-items: center;
      padding: 0 14px;
      border-radius: 999px;
      background: rgba(255, 90, 31, 0.12);
      color: #a33d15;
      font-size: 15px;
      font-weight: 900;
    }
    .final-panel strong {
      display: block;
      margin-top: 28px;
      color: #250d04;
      font-size: 66px;
      line-height: 0.98;
      font-weight: 950;
      letter-spacing: 0;
    }
    .final-panel p {
      margin: 24px 0 0;
      width: 430px;
      color: #5a392b;
      font-size: 23px;
      line-height: 1.28;
      font-weight: 780;
    }
    .final-orbit {
      position: absolute;
      right: 44px;
      bottom: 38px;
      width: 112px;
      height: 112px;
      border-radius: 50%;
      background: linear-gradient(180deg, #ff8a00, #ff5a1f);
      box-shadow: 0 18px 36px rgba(255, 90, 31, 0.24);
    }
    .final-orbit::before,
    .final-orbit::after {
      content: "";
      position: absolute;
      inset: 24px;
      border-radius: 50%;
      border: 10px solid rgba(255, 255, 255, 0.82);
    }
    .final-orbit::after {
      inset: 44px;
      background: #fff;
      border: 0;
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
    ${slide.financeRows ? `<section class="finance-panel"><div class="finance-panel-head"><strong>${slide.financeTitle || "Пример сценария"}</strong><span>${slide.financeBadge}</span></div><div class="finance-table">${slide.financeRows.map(([month, value]) => `<div class="finance-row"><span>${month}</span><span>${value}</span></div>`).join("")}</div><div class="finance-total">${slide.financeTotal}</div></section>` : ""}
    ${slide.riskCards ? `<section class="risk-grid">${slide.riskCards.map(([title, text], index) => `<div class="risk-card"><span>${index + 1}</span><strong>${title}</strong><p>${text}</p></div>`).join("")}</section>` : ""}
    ${slide.steps ? `<section class="steps-grid">${slide.steps.map(([number, title, text]) => `<div class="step-card"><span>${number}</span><div><strong>${title}</strong><p>${text}</p></div></div>`).join("")}</section>` : ""}
    ${slide.partnerGroups ? `<section class="partner-groups">${slide.partnerGroups.map(([name, subtitle, volume, bonus]) => `<div class="partner-group-card"><header><div><strong>${name}</strong><em>${subtitle}</em></div><span>${bonus}</span></header><p>${slide.partnerVolumeLabel || "Личный активный объём"}: ${volume}</p></div>`).join("")}</section>` : ""}
    ${slide.partnerStats ? `<section class="partner-stats">${slide.partnerStats.map(([label, value]) => `<div class="partner-stat"><div><small>${label}</small><strong>${value}</strong></div></div>`).join("")}</section>` : ""}
    ${slide.productCards ? `<section class="product-grid">${slide.productCards.map(([name, status, text]) => `<div class="product-card"><header><strong>${name}</strong><span>${status}</span></header><p>${text}</p></div>`).join("")}</section>` : ""}
    ${slide.architectureCards ? `<section class="architecture-grid">${slide.architectureCards.map(([title, text], index) => `<div class="architecture-card"><span>${index + 1}</span><strong>${title}</strong><p>${text}</p></div>`).join("")}</section>` : ""}
    ${slide.architectureNote ? `<div class="architecture-note">${slide.architectureNote}</div>` : ""}
    ${slide.audienceCards ? `<section class="audience-grid">${slide.audienceCards.map(([title, text], index) => `<div class="audience-card"><span>${index + 1}</span><strong>${title}</strong><p>${text}</p></div>`).join("")}</section>` : ""}
    ${slide.ideaCards ? `<section class="idea-grid">${slide.ideaCards.map(([title, text], index) => `<div class="idea-card"><span>0${index + 1}</span><strong>${title}</strong><p>${text}</p></div>`).join("")}</section>` : ""}
    ${slide.finalCta ? `<section class="final-panel"><small>${slide.finalCta.label}</small><strong>${slide.finalCta.url}</strong><p>${slide.finalCta.note}</p><div class="final-orbit"></div></section>` : ""}
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

for (const slide of selectedSlides) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.setContent(htmlFor(slide), { waitUntil: "load" });
  await page.screenshot({ path: slide.output, fullPage: false });
  await page.close();
}

await browser.close();
