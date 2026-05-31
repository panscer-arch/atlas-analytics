# Atlas Telegram Tasks Bot

Бот нужен как intake-слой для Telegram-задач. Он не является AI-помощником и не отвечает по базе знаний.

## Что умеет

- создавать задачи из Telegram в досках аналитики;
- принимать forwarded/reply сообщения и спрашивать категорию кнопками;
- распознавать голосовые сообщения и ставить их как задачи;
- сохранять решения, вопросы, отчёты и напоминания;
- показывать активные задачи по категории;
- писать в те же content keys, которые читает сайт.

## Команды

```text
/task marketing Сделать 10 картинок для FB
/task launch @rubi до 01.06 Проверить ссылку TikTok в закрепе
/task daily Созвониться по запуску
/today
/tasks marketing
/decision Запускаем FB-контент с понедельника
/question Можно ли купить Premium на Atlas аккаунт?
/report FB создан, ссылка в закрепе, жду правки по КП
/remind завтра 12:00 проверить КП по FB
```

Reply-сценарий:

```text
Ответить на сообщение командой:
/task marketing
```

Бот возьмёт текст исходного сообщения как задачу.

Голосовые:

1. Отправить голосовое в чат.
2. Бот распознает текст и спросит категорию кнопками.
3. После выбора задача появится в аналитике.

Также можно ответить на голосовое командой:

```text
/task marketing
```

Тогда бот распознает voice-message и сразу поставит задачу в маркетинг.

Forward-сценарий:

1. Переслать сообщение в `Atlas Tasks Inbox`.
2. Бот спросит категорию кнопками.
3. После выбора задача появится в аналитике.

## Категории

```text
marketing
launch
landos
content
design
legal
tech
daily
other
```

`marketing`, `launch`, `daily` пишутся в существующие доски. Остальные создаются как custom checklist.

## Настройка на сервере

Создать файл:

```bash
sudo nano /etc/atlas-telegram-bot.env
```

Минимально:

```bash
TELEGRAM_BOT_TOKEN=123456:telegram-token
OPENAI_API_KEY=sk-...
```

Опционально ограничить чаты:

```bash
TELEGRAM_ALLOWED_CHAT_IDS=-1001111111111,-1002222222222
OPENAI_TRANSCRIPTION_MODEL=whisper-1
TELEGRAM_TRANSCRIBE_MAX_BYTES=26214400
```

Перезапустить:

```bash
sudo systemctl restart atlas-telegram-bot.service
sudo systemctl status atlas-telegram-bot.service
```

Логи:

```bash
sudo journalctl -u atlas-telegram-bot.service -f
```

Если `TELEGRAM_BOT_TOKEN` не задан, сервис не падает, а работает в disabled-режиме.

## BotFather

Для групповых задач лучше отключить privacy mode:

```text
@BotFather → /setprivacy → выбрать бота → Disable
```

И добавить бота в нужные группы или в отдельный `Atlas Tasks Inbox`.
