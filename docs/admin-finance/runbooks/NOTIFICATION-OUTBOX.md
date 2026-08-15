# Notification Outbox Runbook

Статус: `IMPLEMENTED CONTRACT · RUNTIME TESTED · CHANNELS DISABLED`.

Текущий runtime принимает только режим `shadow`. Он не содержит HTTP-клиента
Telegram/email, сохраняет только SHA-256 хэши recipient/payload и требует
явного `start()` scheduler. Staging Compose жёстко задаёт
`ATLAS_ADMIN_FINANCE_NOTIFICATIONS_ENABLED=false`.

## Назначение

Контур доставляет только уже созданные source-owned Admin Finance alerts. Он не
рассчитывает финансовые показатели и не создаёт funding instruction сам.

## Гарантии

- один `forecast snapshot + alert + checkpoint + channel` создаёт один SHA-256
  idempotency key;
- повтор ключа с другим payload hash отклоняется как equivocation;
- задачи забираются атомарно через `FOR UPDATE SKIP LOCKED` и lease token;
- provider request key детерминирован для номера попытки;
- каждая завершённая попытка сохраняется append-only;
- resolved destination никогда не записывается в delivery journal;
- `BLOCKED` означает неподключённый канал, а не неудачную отправку;
- acknowledgement alert не закрывает исходное финансовое условие.

## Retry

Только ошибка с явным `retryable=true` может перейти в `RETRY`. Задержка растёт
экспоненциально и ограничивается верхним пределом. После `maxAttempts` ошибка
становится permanent. HTTP-код сам по себе не определяет retryability: это
обязанность конкретного channel adapter.

## Неоднозначная доставка

Если provider принял сообщение, но commit результата в PostgreSQL не прошёл,
worker не записывает вторую классификацию. Lease истекает, после чего задача
повторяется с тем же provider request key. Канал должен поддерживать собственную
идемпотентность либо lookup результата по этому ключу.

## Секреты

`recipient_ref` хранит только ссылку на секрет/группу. Реальный Telegram chat ID,
email-адрес или provider token разрешается server-side resolver непосредственно
перед отправкой и не попадает в payload, audit metadata или error message.

## Условия включения канала

1. Утверждены owner, recipient group и severity routing.
2. Секреты находятся во внешнем secret manager и доступны только worker role.
3. Adapter поддерживает timeout, response-size limit и idempotency key.
4. Пройдены sandbox delivery, retry, timeout и ambiguous-result тесты.
5. PostgreSQL migration, backup/restore и audit retention проверены на staging.
6. Включение выполнено отдельным versioned config change с four-eyes approval.

До выполнения всех пунктов запрещено добавлять provider token или переводить
`ATLAS_ADMIN_FINANCE_NOTIFICATIONS_MODE` в значение, отличное от `shadow`.
