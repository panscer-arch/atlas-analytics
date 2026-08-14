# Atlas Analytics Standalone

Отдельный frontend-репозиторий под аналитику. Нужен для сценария, где аналитика живёт по своей ссылке и просто открывается из общей панели управления.

Atlas Analytics is the public analytics and transparency frontend for Atlas System. It is designed to present activity and contract data from Atlas System on BNB Smart Chain (BSC), with local fallback data when an external API is unavailable.

## Документация

Подробная документация проекта: [docs/atlas-analytics-docs.md](docs/atlas-analytics-docs.md)

## Что внутри

- современная аналитика на `/`
- сводка Dashboard и вкладки аналитики получают агрегированные данные Atlas из BSC через `/api/contracts/atlas-flows`
- восстановленная старая версия на `/legacy`
- mock/fallback-логика уже встроена
- можно подключить внешний analytics API и доску через env
- реестр продуктов доступен по `/?board=products` и хранит данные через отдельный Products API

## Локальный запуск

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Env

Скопируй `.env.example` в `.env.local` при необходимости:

```bash
cp .env.example .env.local
```

Доступные переменные:

- `VITE_ANALYTICS_API_BASE_URL`
  Пример: `https://your-api-domain.com/api/admin/analytics`
- `VITE_ANALYTICS_BOARD_URL`
  Пример: `https://your-board-domain.com`
- `VITE_ANALYTICS_BOARD_API_URL`
  Пример: `https://your-board-domain.com/api/signal`
- `VITE_CONTENT_API_BASE_URL`
  Пример: `https://supersussystem.com`
  Если не задано, сохранение идёт в относительный `/api/content/...` на том же домене.
- `ATLAS_PRODUCTS_DATABASE_URL`
  Серверная строка подключения PostgreSQL для `/api/products`. Во frontend не передаётся.

Если переменные не заданы:

- analytics API просто не используется, экран падает в локальный fallback
- отправка идей в доску не ломает интерфейс и сохраняет идею локально
- редактируемый контент пробует сохраняться в `/api/content/...` на текущем домене и остаётся в localStorage, если сервер сохранения недоступен
- вкладка «Продукты» обращается к отдельному `/api/products`; локальный файловый fallback используется только при запуске API без PostgreSQL

## Проверка реестра продуктов

```bash
npm run test:products
```

Проверка покрывает создание, версионные конфликты, архивирование и восстановление, историю, фильтры, безопасные ссылки, XSS-защиту, сохранение после перезапуска и Markdown-экспорт.

## GitHub -> Netlify

1. Создай новый репозиторий, например `atlas-analytics`
2. Залей содержимое этой папки в корень нового repo
3. В Netlify выбери этот repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. При необходимости добавь env в настройках Netlify

## Что открывать из дашборда

- основная аналитика: `/`
- legacy-версия: `/legacy`
