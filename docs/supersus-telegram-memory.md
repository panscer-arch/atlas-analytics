# Долговременная память Telegram для Hermes

## Назначение

Система сохраняет рабочую историю Atlas из выбранных Telegram-чатов и делает её доступной Hermes для поиска по людям, решениям, задачам, датам и источникам.

Память состоит из двух независимых слоёв:

1. Постоянный локальный архив — исходные сообщения без пересказа и обрезания.
2. Hindsight — бесплатный self-hosted движок смыслового поиска и связей между событиями.

Hindsight не заменяет архив. Если смысловая память ошиблась, исходное сообщение остаётся источником истины.

## Подключение чата

Бот не архивирует произвольные группы автоматически. Владелец Hermes подключает каждый рабочий чат отдельно:

```text
/userid
/memory_here работа по видеопродакшну Atlas
/memory_status
/memory_off
```

- `/userid` показывает числовой Telegram ID пользователя.
- `/memory_here <назначение>` включает сохранение новых сообщений чата.
- `/memory_status` показывает состояние Hindsight и количество локальных записей.
- `/memory_off` останавливает сохранение новых сообщений, не удаляя историю.

Числовой ID владельца задаётся в `/etc/atlas-telegram-bot.env`:

```text
HERMES_OWNER_TELEGRAM_IDS=<telegram-user-id>
```

В группах бот должен быть администратором или иметь право получать все сообщения. Telegram Bot API не отдаёт боту сообщения, которые были написаны до его добавления.

## Постоянный архив

Каждое сообщение или его редакция хранится отдельным неизменяемым JSON-файлом:

```text
/var/lib/atlas-analytics-content/telegram-memory-archive/
└── chats/
    └── <signed-chat-id>/
        └── <year>/<month>/<day>/
            ├── <message-id>.original.json
            └── <message-id>.edit-<timestamp>-<content-hash>.json
```

Архив сохраняет:

- полный текст и расшифровку voice;
- chat ID, название чата и автора;
- дату сообщения и редактирования;
- reply, пересылку и ссылку на сообщение;
- метаданные вложений;
- ошибку расшифровки, если voice не удалось разобрать.

Одинаковое событие не записывается повторно. Архив входит в существующий ежедневный backup каталога `/var/lib/atlas-analytics-content`.

## Hindsight

Используется штатный memory-provider Hermes `hindsight` в режиме `local_embedded`:

- Hindsight и встроенная PostgreSQL работают на сервере SuperSUS;
- лицензия Hindsight — MIT, отдельная подписка не нужна;
- извлечение фактов выполняет настроенная LLM;
- embeddings и reranking выполняются локально;
- daemon завершает работу после пяти минут бездействия.

При подключённой подписке Nous Portal перед каждой синхронизацией служба
`atlas-hermes-hindsight-nous.service` штатно обновляет OAuth credential и
передаёт Hindsight временный inference key. Ключ не попадает в GitHub и логи.

Конфигурация:

```text
/opt/hermes/hindsight/config.json
/opt/hermes/.env
```

Основной банк владельца:

```text
atlas-global
```

Изолированные банки остальных пользователей:

```text
atlas-chat-n<negative-chat-id>
atlas-chat-p<positive-chat-id>
```

Только Telegram-пользователи из `HERMES_OWNER_TELEGRAM_IDS` направляются в общий банк. Это не позволяет участнику одного чата получить через `/hermes` содержание другого чата.

## Синхронизация

Сервис дважды в день отправляет новые архивные события в Hindsight:

```text
atlas-telegram-memory-sync.timer
atlas-telegram-memory-sync.service
```

Расписание: 08:00 и 20:00 по Москве.

Курсор обновляется только после успешного ответа Hermes. До завершения проверки Hindsight синхронизация заблокирована:

```text
HERMES_LONG_TERM_MEMORY_READY=1
```

Очевидные API-ключи, токены и строки `password=...` перед отправкой в LLM маскируются. Неизменённый оригинал остаётся только в локальном архиве.

## Импорт старой истории

Старую переписку можно один раз экспортировать из Telegram Desktop в JSON и импортировать:

```bash
npm run memory:telegram:import -- /path/to/TelegramExport/result.json
npm run memory:telegram:sync
```

Повторный импорт безопасен: существующие события не дублируются.

## Установка на сервере

Перед настройкой в `/opt/hermes/.env` должен находиться `HINDSIGHT_LLM_API_KEY`. Затем:

```bash
sudo -u hermes -H /opt/hermes/configure-hermes-hindsight.sh
sudo -u hermes -H /opt/hermes/.local/bin/hermes memory status
```

После тестового retain/recall выставляется `HERMES_LONG_TERM_MEMORY_READY=1` и запускается первая синхронизация.

## Проверка

```bash
npm run test:telegram-memory
npm run memory:telegram:sync -- --dry-run
```

Проверки покрывают полный текст, дедупликацию, редакции, различие положительных и отрицательных chat ID, вложения, импорт, маскирование секретов, курсор и разграничение банков памяти.

## Исходные проекты

- Hermes memory providers: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/memory-providers.md
- Hindsight: https://github.com/vectorize-io/hindsight
