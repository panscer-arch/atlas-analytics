# Atlas Analytics: документация проекта

Atlas Analytics - отдельное frontend-приложение для операционной аналитики, CRM-задач и контентной базы Atlas. Приложение можно держать на отдельном домене и открывать из основной панели управления как самостоятельный аналитический контур.

## Назначение

Atlas Analytics помогает команде видеть состояние системы в одном рабочем интерфейсе:

- денежные потоки, обязательства, риски выплат и покрытие;
- трафик, онлайн, географию, лидеров, партнёрскую структуру и кошельки;
- продуктовые циклы, реинвест и состав базы;
- задачи запуска, маркетинга, базы знаний, идей и задач на день;
- материалы, презентации, FAQ, датасеты, терминологию и сценарии роликов;
- внешнюю CRM/analytics-board доску через встроенный iframe.

## Технологии

- React 18
- Vite 5
- TanStack Query
- Zustand
- Recharts
- Bootstrap
- Node.js content API для сохранения редактируемого контента

## Быстрый старт

```bash
npm install
npm run dev
```

По умолчанию Vite поднимет локальный сервер и покажет URL в терминале, обычно `http://localhost:5173`.

Сборка production-версии:

```bash
npm run build
```

Проверка production-сборки локально:

```bash
npm run preview
```

## Маршруты

| Маршрут | Что открывает |
| --- | --- |
| `/` | основной Atlas Analytics интерфейс |
| `/legacy` | восстановленная старая версия аналитики |
| `/analytics` | alias для legacy-версии |
| `/analytics-board/` | статическая внешняя доска, если она лежит в `public/analytics-board` |
| `/atlas-site-preview/index.html` | preview сайта Atlas из `public/atlas-site-preview` |

Netlify настроен на SPA fallback через `netlify.toml`: все неизвестные пути отдаются в `index.html`.

## Основные разделы интерфейса

Верхний уровень приложения:

- `Дашборд` - сводка Atlas: BSC-активность, циклы, кошельки и выплаты вместе с операционными карточками SuperSUS.
- `Маркетинг` - маркетинговые направления, поиск площадок, outreach и `Листинги`.
- `Аналитика` - подробный аналитический блок с внутренними вкладками.
- `Продукты` - единое рабочее пространство с реестром, библиотекой и разработками. Фильтры и открытая карточка реестра сохраняются в URL вида `/?board=products&product=<slug>`.
- `Задачи` - рабочие доски запуска, маркетинга, базы знаний, идей и задач на день.
- `Контент` - материалы, презентации, параметры агента, датасет, FAQ, white paper, ролики и терминология.

`Сессия`, `Гермес` и `Расходы` открываются отдельными кнопками в шапке. Название каждой кнопки показывается при наведении.

Вкладки внутри `Аналитика`:

- `Обзор`
- `Трафик / Онлайн`
- `Продукты / Циклы`
- `Реинвест`
- `Состав базы`
- `Лидеры`
- `География`
- `Партнёрская структура`
- `Кошельки`

## Переменные окружения

Создайте `.env.local` из `.env.example`:

```bash
cp .env.example .env.local
```

Доступные переменные:

| Переменная | Назначение |
| --- | --- |
| `VITE_ANALYTICS_API_BASE_URL` | базовый URL backend API аналитики, например `https://analytics-api.pupanel.cc/api/admin/analytics` |
| `VITE_ANALYTICS_BOARD_URL` | URL внешней доски для iframe и кнопки открытия |
| `VITE_ANALYTICS_BOARD_API_URL` | API доски для отправки сигналов/идей, если подключено |
| `VITE_CONTENT_API_BASE_URL` | базовый URL content API; если пусто, frontend ходит в относительный `/api/content/...` |
| `ATLAS_PRODUCTS_DATABASE_URL` | серверная строка подключения PostgreSQL для Products API; во frontend не передаётся |
| `RESEND_API_KEY` | API-ключ Resend для outreach-агента в парсере |
| `OUTREACH_FROM_EMAIL` | email отправителя, например `Superflow Systems <ads@superflowsystems.com>` |
| `OUTREACH_REPLY_TO_EMAIL` | email для ответов площадок |
| `TELEMETR_API_KEY` | API-ключ Telemetr для проверки Telegram-каналов в TG-парсере |
| `TGSTAT_TOKEN` | API-токен TGStat для проверки Telegram-каналов, если Telemetr не подключен или не нашёл канал |

Если переменные не заданы, приложение продолжит работать на mock/fallback-данных. Редактируемый контент будет сохраняться в `localStorage`, а попытки серверного сохранения просто не будут ломать интерфейс.

## Analytics API

Контракт API лежит в `docs/openapi/atlas-analytics-api.v0.2.yaml`.

Frontend ожидает read-only endpoints под `VITE_ANALYTICS_API_BASE_URL`:

- `/overview`
- `/cash-position`
- `/obligations`
- `/plan-fact`
- `/orders`
- `/wallets`
- `/partner-structure`
- `/reinvest`
- `/leaders`
- `/geography`
- `/traffic`
- `/base-composition`

Для каждого запроса frontend передаёт фильтры:

- `dateRange` - например `1d`, `30d`, `365d`, `all`;
- `segment` - сейчас frontend отправляет `all`;
- `product` - `all`, `unity_lockup` или `unity_daily`;
- `country` - сейчас frontend отправляет `all`;
- `network` - сейчас frontend отправляет `all`.

Если API недоступен, отвечает ошибкой или не задан, интерфейс использует локальные mock-данные из `src/modules/analytics/data/analyticsMockData.js`.

## Content API

Редактируемые рабочие доски и контентные шаблоны могут сохраняться через локальный Node.js API:

```bash
ATLAS_CONTENT_API_PORT=8787 \
ATLAS_CONTENT_STORE_DIR=/var/lib/atlas-analytics-content \
node server/content-api.mjs
```

Endpoints:

| Метод | Путь | Назначение |
| --- | --- | --- |
| `GET` | `/api/content/health` | healthcheck |
| `GET` | `/api/content/:key` | загрузить JSON по ключу |
| `PUT` | `/api/content/:key` | сохранить JSON по ключу |
| `POST` | `/api/content/finance-browser-session` | проверить общий пароль Центра расходов и открыть доступ в браузере |
| `POST` | `/api/funnel/session` | выдать или продлить подписанную анонимную сессию пилотной воронки |
| `POST` | `/api/funnel/events` | принять валидированное событие пилотной воронки |
| `POST` | `/api/funnel/leads` | принять заявку после завершённого маршрута |
| `POST` | `/api/funnel/leads/status` | изменить статус заявки из защищённой вкладки SuperSUS |
| `GET` | `/api/funnel/summary` | вернуть защищённую сводку по уникальным сессиям и заявкам |
| `POST` | `/api/outreach/send-email` | отправить outreach email через Resend после подтверждения в UI |
| `POST` | `/api/telegram/verify-channel` | проверить Telegram-канал через Telemetr/TGStat и вернуть контакты, живость, просмотры и дату последнего поста |

## BSC Atlas Flows API

Dashboard и аналитические вкладки используют read-only endpoint `GET /api/contracts/atlas-flows`. Он собирает агрегированные показатели по контрактам Atlas в BNB Smart Chain: количество циклов и участников, объёмы, поступления, выплаты и временные ряды. Wallet addresses в ответ не возвращаются. История Locked/Claimed читается напрямую через `eth_getLogs` и не зависит от HTML-вёрстки BscScan.

Для сбора истории обязателен аутентифицированный HTTPS RPC endpoint с поддержкой исторического `eth_getLogs`. Публичный RPC без SLA не считается production-источником. Запросы делятся на ограниченные диапазоны, а в snapshot попадают только финализированные блоки.

Первый запрос не блокируется долгим RPC-сканированием. Если готового снимка ещё нет, API сразу возвращает состояние `refreshing`; интерфейс повторяет запрос, пока сервер формирует snapshot. Готовый снимок сохраняется в content store и обновляется в фоне.

Сервер хранит файлы как `${ATLAS_CONTENT_STORE_DIR}/${key}.json`. Перед перезаписью существующего файла сервер кладёт копию в `${ATLAS_CONTENT_STORE_DIR}/_backups/${key}/`.

Ограничение размера тела запроса: 10 MB.

## Products API

Вкладка `Продукты` использует отдельный контур данных внутри того же Node.js-сервиса. Каталог не сохраняется одним JSON через универсальный content endpoint.

| Метод | Путь | Назначение |
| --- | --- | --- |
| `GET`, `POST` | `/api/products` | каталог с поиском и фильтрами; создание карточки |
| `GET`, `PATCH` | `/api/products/:id` | подробности и редактирование с проверкой версии |
| `POST` | `/api/products/:id/entries` | неизменяемая заметка, решение, блокер или релиз |
| `POST` | `/api/products/:id/links` | типизированная безопасная `http/https`-ссылка |
| `POST` | `/api/products/:id/transition` | изменение стадии, состояния или доступности с записью в историю |
| `POST` | `/api/products/:id/archive` | обратимая архивация |
| `POST` | `/api/products/:id/restore` | восстановление предыдущей версии или архива |
| `GET` | `/api/products/:id/export.md` | Markdown-снимок для передачи контекста |

Production использует PostgreSQL из `ATLAS_PRODUCTS_DATABASE_URL`. Если переменная не задана, локальная разработка использует файловое хранилище в `${ATLAS_CONTENT_STORE_DIR}/products`; это fallback, а не production-архитектура. Запросы изменения требуют актуальную версию записи (`If-Match` или поле `version`), чтобы параллельные посетители не перезаписывали данные молча.

Outreach-агент вкладки `Парсер` хранит очередь переговоров через content API по ключу `atlas.analytics.hyipOutreach.queue.v1`. Отправка email не работает без `RESEND_API_KEY`, `OUTREACH_FROM_EMAIL` и `OUTREACH_REPLY_TO_EMAIL`; в этом случае UI создаёт черновики и Telegram-тексты, но показывает понятную ошибку при попытке отправить email.

На VPS эти переменные читаются сервисом `atlas-content-api.service` из файла `/etc/atlas-outreach.env`:

```bash
RESEND_API_KEY=re_...
OUTREACH_FROM_EMAIL=Atlas System <partners@atlas-system.io>
OUTREACH_REPLY_TO_EMAIL=partners@atlas-system.io
TELEMETR_API_KEY=...
TGSTAT_TOKEN=...
ATLAS_FINANCE_PASSWORD=...
BSC_LOG_RPC_URLS=https://history-capable-bsc-rpc.example/<server-side-token>
ATLAS_CONTRACTS_LOG_CHUNK=1000
ATLAS_CONTRACTS_LOG_CONCURRENCY=2
ATLAS_CONTRACTS_FINALITY_BLOCKS=15
```

`BSC_LOG_RPC_URLS` хранится как GitHub Actions secret и серверная переменная. URL с токеном нельзя вставлять в frontend, логи, документацию или Git. Content API и deployment останавливаются, если отдельный history-capable endpoint не задан; публичные RPC не используются как скрытый fallback для истории.
Первый запуск делает полный backfill от независимо проверенных deployment blocks. После каждого контракта сервер сохраняет проверенные event logs и finalized checkpoint в `atlas.analytics.bscFlowEventHistory.v1`; следующие refresh читают только новые блоки. Address, deployment block и event topics привязаны к checkpoint. Их mismatch, malformed log или checkpoint выше finalized head останавливают обновление.

`ATLAS_FUNNEL_SIGNING_SECRET` обязателен для `/api/funnel/session`. Его нужно создать отдельно, например командой `openssl rand -hex 32`, хранить только в `/etc/atlas-funnel.env` и подключать к `atlas-content-api.service` отдельным systemd drop-in. Секрет нельзя добавлять во frontend, общий outreach-конфиг или Git.

Публичная форма воронки принимает только имя, один контакт, страну и сообщение. Заявка
разрешена после события `route_completed`, привязана к подписанной анонимной сессии,
защищена honeypot-полем и rate limit. Контакты хранятся до 180 дней в закрытом ключе
`atlas.analytics.firstFunnelLeads.v1`; получить их через общий `/api/content/:key`
нельзя. Новая заявка дополнительно отправляется в настроенный маркетинговый Telegram-чат.

После изменения файла нужно перезапустить backend:

```bash
sudo systemctl restart atlas-content-api.service
```

`ATLAS_FINANCE_PASSWORD` хранится только на сервере. После успешного ввода Центр расходов
устанавливает защищённый HttpOnly cookie на 30 дней; смена пароля автоматически отменяет
ранее выданный доступ. Кнопка `Выйти` отзывает доступ только в текущем браузере.

## Backup контента

Для архивации content store есть скрипт:

```bash
ATLAS_CONTENT_STORE_DIR=/var/lib/atlas-analytics-content \
ATLAS_CONTENT_BACKUP_DIR=/var/backups/atlas-analytics-content \
bash server/backup-content.sh
```

Переменные:

| Переменная | Значение по умолчанию | Назначение |
| --- | --- | --- |
| `ATLAS_CONTENT_STORE_DIR` | `/var/lib/atlas-analytics-content` | директория JSON-хранилища |
| `ATLAS_CONTENT_BACKUP_DIR` | `/var/backups/atlas-analytics-content` | директория архивов |
| `ATLAS_CONTENT_BACKUP_RETENTION_DAYS` | `30` | сколько дней хранить архивы |
| `ATLAS_CONTENT_BACKUP_INCLUDE_INTERNAL` | `0` | включать ли внутреннюю папку `_backups` |

Скрипт создаёт архив вида `atlas-analytics-content-YYYYMMDDTHHMMSSZ.tar.gz` и обновляет symlink `latest.tar.gz`.

PostgreSQL-каталог продуктов архивируется отдельно:

```bash
ATLAS_PRODUCTS_DATABASE_URL='postgresql://www-data@/atlas_products?host=/var/run/postgresql' \
ATLAS_PRODUCTS_RESTORE_TEST_URL='postgresql://www-data@/atlas_products_restore_test?host=/var/run/postgresql' \
ATLAS_PRODUCTS_BACKUP_DIR=/var/backups/atlas-products \
node scripts/backup-products-registry.mjs
```

Скрипт создаёт `pg_dump`, проверяет архив и выполняет пробное восстановление в отдельную test-базу. Production deploy подключает этот шаг к ежедневному `atlas-content-backup.timer`.

## Хранение данных на клиенте

Приложение использует `localStorage` как локальный fallback для:

- задач и архивов;
- материалов;
- параметров агента;
- FAQ;
- датасета;
- терминологии;
- роликов;
- быстрых заметок;
- персональных CRM-задач.

Если подключён `VITE_CONTENT_API_BASE_URL`, часть этих данных дополнительно синхронизируется с серверным content API. При ошибке сети интерфейс остаётся рабочим и продолжает использовать локальное состояние.

## Деплой на Netlify

1. Залейте содержимое репозитория в GitHub.
2. Создайте сайт в Netlify из этого репозитория.
3. Укажите build command:

```bash
npm run build
```

4. Укажите publish directory:

```text
dist
```

5. Добавьте нужные env-переменные в настройках Netlify.

`netlify.toml` уже содержит нужные настройки сборки и SPA redirect.

## Структура проекта

```text
atlas-analytics-repo/
  docs/
    atlas-system-white-paper-v0.6.md
    openapi/atlas-analytics-api.v0.2.yaml
  public/
    analytics-board/
    atlas-site-preview/
    generated/
  server/
    content-api.mjs
    backup-content.sh
    products/
      001_products_registry.sql
      products-registry.mjs
      products-registry-seed.mjs
  src/
    App.jsx
    main.jsx
    modules/analytics/
      AnalyticsPage.jsx
      AnalyticsRestoredPage.jsx
      charts/
      components/
      data/
      hooks/
      services/
      styles/
      utils/
```

## Где менять ключевые части

| Задача | Файл/папка |
| --- | --- |
| Добавить или изменить вкладку верхнего уровня | `src/modules/analytics/AnalyticsPage.jsx` |
| Изменить API-интеграцию | `src/modules/analytics/services/analyticsApi.js` |
| Изменить content API клиент | `src/modules/analytics/services/contentStore.js` |
| Изменить вкладку и карточки продуктов | `src/modules/analytics/components/ProductsRegistry.jsx` |
| Изменить Products API клиент | `src/modules/analytics/services/productsRegistryApi.js` |
| Изменить схему или сервер Products API | `server/products/` |
| Изменить mock-данные | `src/modules/analytics/data/analyticsMockData.js` |
| Изменить задачи и контентные доски | `src/modules/analytics/components/LaunchChecklistSection.jsx` |
| Изменить стили аналитики | `src/modules/analytics/styles/analytics.css` |
| Изменить legacy-страницу | `src/modules/analytics/AnalyticsRestoredPage.jsx` |
| Обновить OpenAPI-контракт | `docs/openapi/atlas-analytics-api.v0.2.yaml` |

## Рекомендованный production-контур

Минимальный контур:

- static frontend на Netlify/Vercel/Nginx;
- backend analytics API на отдельном домене;
- content API за reverse proxy на том же домене или под отдельным origin;
- отдельная PostgreSQL-база для Products API, доступная только backend-сервису;
- регулярный backup `ATLAS_CONTENT_STORE_DIR`;
- ежедневный `pg_dump` реестра продуктов с пробным восстановлением;
- Bearer-token и IP allowlist для analytics API по контракту OpenAPI.

Если frontend и content API находятся на одном домене, можно оставить `VITE_CONTENT_API_BASE_URL` пустым и проксировать `/api/content/*` на `server/content-api.mjs`.

На том же домене `/api/products*` проксируется в `server/content-api.mjs`. Открытое редактирование защищено запретом hard delete, audit trail, version conflict, Origin-проверкой, rate limit, очисткой Markdown и allowlist для URL.

## Smoke checklist после изменений

Перед выкладкой проверьте:

- `npm run build` завершается без ошибок;
- `/` открывает основной интерфейс;
- `/legacy` открывает восстановленную версию;
- основное меню содержит `Дашборд`, `Маркетинг`, `Аналитика`, `Продукты`, `Задачи`, `Контент`;
- кнопки `Сессия`, `Гермес` и `Расходы` доступны в шапке, а `Листинги` находятся внутри `Маркетинга`;
- все вкладки `Аналитики` переключаются без ошибок и явно отмечают данные, которых нет в BSC-источнике;
- `GET /api/contracts/atlas-flows` отвечает без ожидания полного RPC-сканирования и возвращает snapshot или состояние `refreshing`;
- при пустом `VITE_ANALYTICS_API_BASE_URL` отображаются fallback-данные;
- при подключённом analytics API вкладки получают реальные данные;
- редактируемые материалы/задачи сохраняются в `localStorage`;
- если подключён content API, `GET /api/content/health` возвращает `{ "ok": true }`;
- `npm run test:products` проходит без ошибок;
- `GET /api/products` возвращает каталог и `storageMode: "postgres"` в production;
- `/?board=products` восстанавливает фильтры и открытую карточку из URL;
- iframe доски открывает корректный `VITE_ANALYTICS_BOARD_URL`.
