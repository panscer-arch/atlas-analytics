# Atlas Analytics Standalone

Отдельный frontend-репозиторий под аналитику. Нужен для сценария, где аналитика живёт по своей ссылке и просто открывается из общей панели управления.

## Что внутри

- современная аналитика на `/`
- восстановленная старая версия на `/legacy`
- mock/fallback-логика уже встроена
- можно подключить внешний analytics API и доску через env

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

Если переменные не заданы:

- analytics API просто не используется, экран падает в локальный fallback
- отправка идей в доску не ломает интерфейс и сохраняет идею локально
- редактируемый контент пробует сохраняться в `/api/content/...` на текущем домене и остаётся в localStorage, если сервер сохранения недоступен

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
