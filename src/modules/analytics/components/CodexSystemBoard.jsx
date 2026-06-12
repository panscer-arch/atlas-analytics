import { useMemo, useState } from "react";
import "./CodexSystemBoard.css";

const CODEX_SOURCE_URL = "https://vibe.sukharev.dev/knowledge-base/#basic-principles";

const CODEX_RESOURCE_FILTER = [
  {
    status: "Внедрить",
    title: "Альманах практик Codex / Claude Code",
    url: "https://vibe.sukharev.dev/knowledge-base/",
    use: "База для наших рабочих правил: PRD, TASKS, review-loop, security gate, refactoring и production monitoring.",
    codexFit: "Работает прямо в Codex: это промпты, процессы и чеклисты, без установки внешних инструментов.",
  },
  {
    status: "Внедрить",
    title: "GitHub spec-kit",
    url: "https://github.com/github/spec-kit",
    use: "Можно использовать как ориентир для spec-driven разработки, когда продукт большой и нужно дисциплинировать ТЗ.",
    codexFit: "Полезно как структура мышления. В Codex достаточно PRD-интервью и TASKS.md; ставить spec-kit не обязательно.",
  },
  {
    status: "Пробовать",
    title: "di-sukharev/vibe template",
    url: "https://github.com/di-sukharev/vibe",
    use: "Шаблон старта web/mobile продукта: backend, auth, frontend, mobile, Postgres и deploy-доки.",
    codexFit: "Полезно только для нового продукта. В текущую SuperSystem не тащить целиком, можно брать архитектурные идеи.",
  },
  {
    status: "Пробовать",
    title: "vibe mobile / iap branches",
    url: "https://github.com/di-sukharev/vibe/tree/mobile",
    use: "Ориентир, если понадобится мобильное приложение, push, Apple/Google login или платежи App Store / Google Play.",
    codexFit: "Codex может разобрать ветку и перенести паттерны, но только под конкретную задачу mobile/IAP.",
  },
  {
    status: "Не тащить",
    title: "OpenCommit",
    url: "https://github.com/di-sukharev/opencommit",
    use: "AI-генерация commit messages.",
    codexFit: "В Codex не нужен как зависимость: Codex уже пишет коммиты. Можно взять только идею качественного commit summary.",
  },
  {
    status: "Проверять",
    title: "GitHub Copilot / AI privacy settings",
    url: "https://github.com/settings/copilot/features",
    use: "Проверка приватности AI-фич для private repositories.",
    codexFit: "Полезно как security checklist перед работой с приватным кодом и репозиториями.",
  },
  {
    status: "Изучить",
    title: "Hermes Agent",
    url: "https://github.com/nousresearch/hermes-agent",
    use: "Постоянный self-hosted агент с памятью, skills, Telegram/Discord-интерфейсом и делегированием coding-задач в Codex.",
    codexFit: "Полезен как диспетчер над Codex, но ставить только после отдельного security/setup-плана для VPS, Telegram и доступов.",
  },
];

const CODEX_PLAYBOOK = [
  {
    id: "brief",
    icon: "PRD",
    title: "PRD перед кодом",
    tag: "Старт продукта",
    readiness: "обязательно",
    summary: "Перед большой фичей сначала собрать короткое ТЗ: проблема, сценарии, ограничения, что точно не делаем.",
    prefacts: [
      "Что строим и для кого: пользователь, роль, основной сценарий.",
      "Какие данные уже есть в SuperSystem, какие нужно добавить и где они сохраняются.",
      "Что нельзя ломать: старые ссылки, серверное сохранение, текущий дизайн и прод-домен.",
    ],
    useWhen: [
      "Новый продукт, раздел или крупная механика в SuperSystem.",
      "Есть идея, но неясно, какие экраны, роли и данные нужны.",
      "Нужно отдать Codex задачу так, чтобы он не додумывал продукт за тебя.",
    ],
    steps: [
      "Попросить Codex провести PRD-интервью вопросами по одному.",
      "Собрать ответы в PRD.md без открытых вопросов.",
      "В новом контексте попросить найти дырки и противоречия.",
      "После проверки разбить PRD на TASKS.md.",
    ],
    output: [
      "PRD.md в корне проекта или в docs/.",
      "Список рисков и открытых решений.",
      "TASKS.md с маленькими задачами.",
    ],
    prompt: `Давай сделаем PRD для [название продукта/раздела].
Идея: [описание].
Задавай мне вопросы по одному, с вариантами ответа.
Когда вопросов не останется, создай PRD.md: только четкое ТЗ, без размышлений и открытых вопросов.`,
    code: `# артефакты после PRD
docs/[feature]/PRD.md
docs/[feature]/TASKS.md

# проверка перед кодом
rg -n "[feature|storage key|button text]" src`,
  },
  {
    id: "epic-flow",
    icon: "EPIC",
    title: "Эпик → user stories",
    tag: "Флоу компании",
    readiness: "для каждой идеи",
    summary: "Любую идею превращать в эпик, затем в user stories, backend/frontend/design/QA подзадачи и только потом отдавать в реализацию маленькими кусками.",
    prefacts: [
      "Эпик описывает бизнес-цель, пользователя, сценарии, данные, ограничения и критерии готовности.",
      "User story отвечает на вопрос: кто что делает и какую ценность получает.",
      "Каждая story дробится на маленькие задачи: backend, frontend, хранение данных, дизайн, QA, deploy.",
    ],
    useWhen: [
      "Появилась идея новой вкладки, CRM-раздела, мобильного экрана, контент-центра или автоматизации.",
      "Задача звучит слишком широко: “сделай приложение”, “добавь раздел”, “переделай кабинет”.",
      "Нужно имитировать нормальный продуктовый процесс компании и получить более качественный код.",
    ],
    steps: [
      "Сначала попросить Codex оформить идею как Epic Brief: цель, пользователи, сценарии, данные, ограничения, риски.",
      "Потом разбить эпик на user stories с acceptance criteria для каждой story.",
      "Для каждой story выделить backend, frontend, design/content, QA и deploy-подзадачи.",
      "Выбрать одну маленькую подзадачу и реализовать только ее, без соседних улучшений.",
      "После каждой подзадачи пройти build, browser-check, review-loop и отметить прогресс в TASKS.md.",
    ],
    output: [
      "docs/[feature]/EPIC.md с полным описанием идеи.",
      "docs/[feature]/USER_STORIES.md с историями и критериями приемки.",
      "docs/[feature]/TASKS.md с маленькими backend/frontend/QA задачами.",
      "Реализация по одному change set за раз: чище код, меньше хаоса, проще проверять.",
    ],
    prompt: `У меня появилась идея: [описание идеи].
Оформи ее как полноценный эпик в стиле продуктовой команды.
Сначала задай мне недостающие вопросы по одному, если без них нельзя сделать качественную декомпозицию.
Затем создай:
1. Epic Brief: цель, пользователь, проблема, сценарии, данные, ограничения, риски, что не делаем.
2. User Stories: “как [роль], я хочу [действие], чтобы [ценность]”.
3. Acceptance Criteria для каждой story.
4. Декомпозицию на backend, frontend, design/content, QA, deploy.
5. TASKS.md: маленькие задачи, которые можно выполнять по одной.
После этого не пиши код, пока я не выберу первую маленькую задачу.`,
    code: `docs/[feature]/EPIC.md
docs/[feature]/USER_STORIES.md
docs/[feature]/TASKS.md

# правило реализации
1 epic -> many stories -> many small tasks
1 Codex pass -> 1 task -> build/check/review`,
  },
  {
    id: "small-steps",
    icon: "STEP",
    title: "Маленькие change set",
    tag: "Рабочий цикл",
    readiness: "каждый день",
    summary: "Большую разработку дробить так, чтобы один проход Codex менял один понятный кусок поведения.",
    prefacts: [
      "Одна задача равна одному изменению поведения, а не пачке соседних улучшений.",
      "Перед стартом назвать файлы, которые, скорее всего, будут затронуты.",
      "После изменения обязательно: build, targeted browser check и короткий список рисков.",
    ],
    useWhen: [
      "Задача звучит как “сделай систему”, “переделай раздел”, “добавь CRM”.",
      "Есть риск, что модель потеряет контекст или смешает несколько решений.",
      "Нужно параллелить работу по разным окнам/агентам.",
    ],
    steps: [
      "Выбрать первую незакрытую задачу из TASKS.md.",
      "Перед кодом попросить разобрать edge cases.",
      "Реализовать только один безопасный кусок.",
      "После реализации прогнать targeted checks.",
    ],
    output: [
      "Один осмысленный коммит.",
      "Понятная проверка: build/test/browser.",
      "Следующая задача не смешана с текущей.",
    ],
    prompt: `Возьми первую незакрытую задачу из TASKS.md.
Сначала коротко найди риски и edge cases.
Потом реализуй только этот change set, без соседних рефакторингов.
В конце запусти минимальные проверки и отметь, что осталось следующим шагом.`,
    code: `npm run build
npm run check:local -- '--url=http://127.0.0.1:3036/?board=[board]' --waitUntil=domcontentloaded --textIncludes='[ключевой текст]'`,
  },
  {
    id: "review-loop",
    icon: "REV",
    title: "Review-loop",
    tag: "Качество",
    readiness: "после задачи",
    summary: "После каждой фичи отдельно искать регрессии, баги, лишние абстракции, дырки в тестах и проблемы безопасности.",
    prefacts: [
      "Сначала read-only: не исправлять до списка доказанных проблем.",
      "Каждая проблема должна иметь file:line и реальный сценарий поломки.",
      "Косметику и вкусовщину отделять от регрессий, безопасности и потери данных.",
    ],
    useWhen: [
      "Фича уже собрана и хочется сразу деплоить.",
      "Затронуты данные, платежи, доступы, пароль, приватность или прод.",
      "Код получился большим и есть ощущение, что где-то спряталась ошибка.",
    ],
    steps: [
      "Запустить read-only review активных изменений.",
      "Требовать только подтвержденные проблемы с file:line.",
      "Отделить реальные баги от вкусовщины.",
      "Починить только actionable замечания и проверить снова.",
    ],
    output: [
      "Список severity P0/P1/P2.",
      "Минимальные fixes.",
      "Тесты или сценарии, которые ловят проблему.",
    ],
    prompt: `Сделай глубокое code review активных изменений. Работай read-only, ничего не меняй.
Ищи только серьезные подтвержденные проблемы: регрессии, ошибки логики, безопасность, приватность, потеря данных, нехватка важных тестов.
Проверь цепочку route/guard -> handler/service -> API contract -> persistence/external services.
Верни: severity, file:line, доказательство по коду, риск, минимальный fix и какой тест это должен поймать.`,
    code: `git diff --stat
git diff -- src/modules/analytics
rg -n "TODO|FIXME|throw new Error|localStorage|saveServerContent" src/modules/analytics`,
  },
  {
    id: "search",
    icon: "RG",
    title: "Точный поиск по коду",
    tag: "Навигация",
    readiness: "всегда",
    summary: "Для кода главным источником истины остаются файлы, имена функций, rg и маленькие окна вокруг найденных строк.",
    prefacts: [
      "Искать по тексту кнопки, board id, storage key, имени компонента или API route.",
      "Сначала найти владельца поведения, потом читать маленькое окно вокруг кода.",
      "Не начинать с глобального рефакторинга, пока не найдено место поломки.",
    ],
    useWhen: [
      "Нужно понять, где живет поведение.",
      "Хочется построить RAG/память вместо чтения репозитория.",
      "Есть баг, но неизвестен владелец: UI, API, storage или deploy.",
    ],
    steps: [
      "Сначала предположить область по структуре проекта.",
      "Искать узко через rg по компоненту, route, storage key, тексту кнопки.",
      "Открывать 40-120 строк вокруг совпадения.",
      "Остановиться, когда найден владелец поведения.",
    ],
    output: [
      "Карта path:line.",
      "Владелец поведения.",
      "Минимальная зона изменений.",
    ],
    prompt: `Найди владельца поведения [описание].
Работай read-only. Не начинай с широкого поиска.
Сначала предположи область проекта, затем ищи точечно через rg.
Верни path:line, символ/компонент/route, короткий snippet и почему это место важно.`,
    code: `rg -n "[текст кнопки|board id|storage key]" src server
sed -n '[start],[end]p' path/to/file
rg --files src/modules/analytics/components | sort`,
  },
  {
    id: "refactor",
    icon: "DX",
    title: "Аккуратный рефакторинг",
    tag: "DX",
    readiness: "раз в 1-2 недели",
    summary: "Рефакторинг не ради красоты: найти объективную боль, зафиксировать поведение проверкой и упростить без изменения продукта.",
    prefacts: [
      "Стиль компонента живет внутри компонента; layout можно выносить наружу.",
      "Перед изменением зафиксировать сценарий, который нельзя сломать.",
      "Не тащить временные overrides, если можно сделать нормальный проп или отдельный компонент.",
    ],
    useWhen: [
      "Компонент стал слишком большим и страшно вносить правки.",
      "UI стили расползлись через overrides и случайные className.",
      "Поведение работает, но поддержка становится дорогой.",
    ],
    steps: [
      "Назвать конкретную боль: сложность, дубли, риск.",
      "Покрыть важное поведение тестом или browser-check.",
      "Переписать маленькими шагами.",
      "Сравнить поведение до/после.",
    ],
    output: [
      "Меньше кода или проще структура.",
      "Сохраненная бизнес-логика.",
      "Проверка на ключевой сценарий.",
    ],
    prompt: `Проведи care-refactoring для [область].
Цель не эстетика, а снижение реальной сложности поддержки.
Сначала найди объективные боли и риски, предложи маленький план.
Перед изменением зафиксируй важное поведение проверкой, затем упростить код без изменения продукта.`,
    code: `npm run build
npm run check:local -- '--url=http://127.0.0.1:3036/' --waitUntil=domcontentloaded --timeout=30000
git diff --check`,
  },
  {
    id: "security",
    icon: "SEC",
    title: "Security gate",
    tag: "Перед продом",
    readiness: "перед релизом",
    summary: "Перед публичным релизом отдельно проверять доступы, ID enumeration, приватность, настройки AI и цепочку данных.",
    prefacts: [
      "Есть ли приватные данные: дневник, CRM, Telegram chat id, токены, env, серверные ключи.",
      "Можно ли открыть чужой объект по id или короткой ссылке.",
      "Что публично пишем: security review не равно independent audit.",
    ],
    useWhen: [
      "Есть логин, пароли, приватные данные, платежи, CRM, дневник или админка.",
      "Фича выходит в прод и ее увидят реальные пользователи.",
      "Менялись backend endpoints, права доступа или storage.",
    ],
    steps: [
      "Проверить нельзя ли перебрать id и получить чужие данные.",
      "Проверить guard/auth на каждом endpoint.",
      "Проверить приватные настройки AI/Copilot для private repo.",
      "Проверить supply-chain при тревожных новостях о пакетах.",
    ],
    output: [
      "Security findings по приоритету.",
      "План исправления.",
      "Повторная проверка после фикса.",
    ],
    prompt: `Проведи глубокий security audit перед продом.
Проверь реальные слабые места: auth/guards, ID enumeration, приватность, доступы к данным, env/secrets, supply-chain.
Можно запускать саб-агентов по участкам кода.
Финально дай список проблем, риск, доказательство и план исправления по приоритету.`,
    code: `rg -n "token|secret|password|passcode|TELEGRAM|PRIVATE|api/content" . --glob '!node_modules'
rg -n "params|get\\(|post\\(|delete\\(|saveServerContent|localStorage" src server`,
  },
  {
    id: "automation",
    icon: "AUTO",
    title: "Автоматизации Codex",
    tag: "Операции",
    readiness: "после релиза",
    summary: "Codex можно использовать как сторожа: смотреть логи, сохранять инциденты, готовить разборы и не смешивать мониторинг с фиксом.",
    prefacts: [
      "Автоматизация не чинит сама: она собирает факты, ошибки и ссылки.",
      "Отдельно хранить мониторинг, triage и исправления.",
      "После каждого деплоя проверять живой домен и asset-файлы.",
    ],
    useWhen: [
      "Сайт уже в проде и ошибки нужно ловить регулярно.",
      "Нужно раз в день собирать список проблем, а чинить отдельно.",
      "Есть repeated-процессы: ревью, ретро, документация, canary.",
    ],
    steps: [
      "Настроить мониторинг логов раз в 30 минут.",
      "Сохранять только actionable ошибки в errors/*.md.",
      "Раз в день разбирать errors/ отдельно.",
      "После релиза запускать canary/browser-check.",
    ],
    output: [
      "Папка errors/ с инцидентами.",
      "Ежедневный triage.",
      "Меньше неожиданных падений в проде.",
    ],
    prompt: `Раз в 30 минут проверь production logs.
Не ищи root cause и не чини код.
Только сохрани actionable инциденты в errors/<error_name>.md:
время, trace, контекст, частота, affected endpoint/page, ссылка на логи.`,
    code: `npm run check:local -- '--url=https://supersussystem.com/' --waitUntil=domcontentloaded --timeout=30000
ssh root@[server] "systemctl status nginx --no-pager"
ssh root@[server] "ls -1 /opt/atlas-analytics/app/dist/assets | tail -5"`,
  },
  {
    id: "hermes",
    icon: "BOT",
    title: "Hermes Agent",
    tag: "Постоянный агент",
    readiness: "через setup",
    summary: "Hermes можно использовать как постоянного диспетчера SuperSUS: он помнит проекты, принимает задачи из Telegram, ведет навыки и делегирует кодинг в Codex.",
    prefacts: [
      "Hermes не должен получать production secrets на первом пилоте.",
      "Telegram-доступы только через whitelist чатов и ролей.",
      "Codex остается coding executor, Hermes только диспетчер задач и памяти.",
    ],
    useWhen: [
      "Нужно писать задачи голосом/из Telegram и превращать их в понятные Codex-задачи.",
      "Нужен постоянный агент, который помнит SuperSUS, Codex OS, деплой, дневник, контент и CRM.",
      "Нужно мониторить рутину: статусы деплоев, ошибки, еженедельные отчеты, новые идеи, контент-задачи.",
    ],
    steps: [
      "Поднять Hermes отдельно на VPS или локальной машине, не внутри production SuperSUS.",
      "Подключить модель и Codex CLI как coding-исполнителя, а Hermes оставить диспетчером.",
      "Подключить Telegram только после security gate: токены, права, кто может писать агенту.",
      "Дать Hermes playbook SuperSUS: где repo, как запускать build/test/deploy, что нельзя делать без подтверждения.",
    ],
    output: [
      "Telegram-командный центр для задач SuperSUS.",
      "Память по проектам: Codex OS, контент, CRM, дневник, деплой, ошибки.",
      "Автоматизации без хаоса: Hermes ставит задачу и следит, Codex пишет код и проверяет.",
    ],
    prompt: `Hermes/SuperSUS setup plan:
1. Не устанавливай ничего сразу.
2. Сначала составь security/setup план: где будет жить Hermes, какие токены нужны, кто имеет доступ, какие команды запрещены без подтверждения.
3. Опиши роли: Hermes = диспетчер и память, Codex = coding executor, SuperSUS = продуктовая система.
4. Составь список первых автоматизаций: Telegram intake, weekly audit, deploy canary, content task triage, error report.
5. После согласования предложи минимальный pilot без доступа к production secrets.`,
    code: `# pilot без production secrets
HERMES_MODE=pilot
ALLOWED_TELEGRAM_CHAT_IDS=-5158247269,-4993332821
CODEX_WORKSPACE=/Users/digitex/Desktop/Проект2/atlas-analytics-repo`,
  },
];

const SYSTEM_LAYERS = [
  {
    title: "Префакты",
    value: "контекст до задачи",
    text: "Короткие факты, которые Codex должен знать перед кодом: цель, board id, storage key, что нельзя ломать.",
  },
  {
    title: "Промпты",
    value: "готовые команды",
    text: "Не общие просьбы, а конкретные формулировки под PRD, review, security, refactoring и deploy-check.",
  },
  {
    title: "Код",
    value: "шаблоны проверок",
    text: "Команды и файловые ориентиры: rg, build, check:local, deploy assets, server content.",
  },
  {
    title: "Гейты",
    value: "до деплоя",
    text: "Build, targeted browser check, live-domain check, security/privacy review для чувствительных разделов.",
  },
];

const AUTOMATION_IDEAS = [
  {
    cadence: "Перед задачей",
    title: "Risk scout",
    text: "Read-only проход по edge cases, данным, доступам и местам, где задача может сломать прод.",
  },
  {
    cadence: "После задачи",
    title: "Review-loop 9.5",
    text: "Независимое ревью active diff: регрессии, лишний код, безопасность, тесты, элегантность.",
  },
  {
    cadence: "После деплоя",
    title: "Canary + logs",
    text: "Открыть живую страницу, проверить core flow, собрать console/server errors и сохранить инциденты.",
  },
  {
    cadence: "Always-on",
    title: "Hermes dispatcher",
    text: "Принимать задачи из Telegram, раскладывать их по SuperSUS-направлениям и делегировать coding-задачи в Codex.",
  },
];

function CodexSystemBoard() {
  const [activeId, setActiveId] = useState(CODEX_PLAYBOOK[0].id);
  const activeBlock = useMemo(
    () => CODEX_PLAYBOOK.find((block) => block.id === activeId) || CODEX_PLAYBOOK[0],
    [activeId],
  );

  return (
    <section className="analytics-codex-system">
      <div className="analytics-codex-system-hero">
        <div>
          <span className="analytics-codex-system-kicker">Codex OS</span>
          <h2>Суперсистема разработки</h2>
          <p>
            Практическая выжимка из альманаха Сухарева: как ставить задачи Codex, дробить разработку,
            ревьюить изменения, защищать прод и превращать повторяемые процессы в скиллы и автоматизации.
          </p>
        </div>
        <a className="analytics-codex-system-source" href={CODEX_SOURCE_URL} target="_blank" rel="noreferrer">
          Открыть источник
        </a>
      </div>

      <div className="analytics-codex-system-layers" aria-label="Слои Codex OS">
        {SYSTEM_LAYERS.map((item) => (
          <article key={item.title}>
            <span>{item.title}</span>
            <strong>{item.value}</strong>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <div className="analytics-codex-system-layout">
        <aside className="analytics-codex-system-sidebar" aria-label="Разделы Codex-системы">
          {CODEX_PLAYBOOK.map((block) => (
            <button
              key={block.id}
              className={`analytics-codex-system-nav-item${block.id === activeBlock.id ? " is-active" : ""}`}
              type="button"
              onClick={() => setActiveId(block.id)}
            >
              <span className="analytics-codex-system-nav-icon">{block.icon}</span>
              <span>
                <strong>{block.title}</strong>
                <span>{block.tag}</span>
              </span>
            </button>
          ))}
        </aside>

        <div className="analytics-codex-system-main">
          <article className="analytics-codex-system-reader">
            <header className="analytics-codex-system-reader-head">
              <div>
                <span className="analytics-codex-system-badge">{activeBlock.tag}</span>
                <h3>{activeBlock.icon} {activeBlock.title}</h3>
                <p>{activeBlock.summary}</p>
              </div>
              <div className="analytics-codex-system-score">
                <span>режим</span>
                <strong>{activeBlock.readiness}</strong>
              </div>
            </header>

            <div className="analytics-codex-system-grid">
              <section className="analytics-codex-system-section">
                <h4>Когда применять</h4>
                <ul>{activeBlock.useWhen.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section className="analytics-codex-system-section analytics-codex-system-section-prefacts">
                <h4>Префакты перед запуском</h4>
                <ul>{activeBlock.prefacts.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section className="analytics-codex-system-section">
                <h4>Как запускать</h4>
                <ul>{activeBlock.steps.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section className="analytics-codex-system-section">
                <h4>Что должно получиться</h4>
                <ul>{activeBlock.output.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>
          </article>

          <section className="analytics-codex-system-prompt">
            <h4>Готовый промпт</h4>
            <pre>{activeBlock.prompt}</pre>
          </section>

          <section className="analytics-codex-system-prompt analytics-codex-system-code">
            <h4>Код / команды / ориентиры</h4>
            <pre>{activeBlock.code}</pre>
          </section>

          <section className="analytics-codex-system-automations">
            <h4>Автоматизации, которые стоит добавить в Codex</h4>
            <div className="analytics-codex-system-automation-list">
              {AUTOMATION_IDEAS.map((item) => (
                <div className="analytics-codex-system-automation-card" key={item.title}>
                  <span>{item.cadence}</span>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="analytics-codex-system-resources">
            <div>
              <span className="analytics-codex-system-kicker">Фильтр полезности</span>
              <h4>Что реально применять в Codex</h4>
              <p>Сохраняем только то, что можно превратить в промпт, скилл, проверку, шаблон задачи или архитектурный ориентир.</p>
            </div>
            <div className="analytics-codex-system-resource-list">
              {CODEX_RESOURCE_FILTER.map((item) => (
                <a className="analytics-codex-system-resource-card" href={item.url} target="_blank" rel="noreferrer" key={item.title}>
                  <span>{item.status}</span>
                  <strong>{item.title}</strong>
                  <p>{item.use}</p>
                  <small>{item.codexFit}</small>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export default CodexSystemBoard;
