# Atlas System — Foundry access-control tests

Версия: V1  
Дата: 2026-06-05  
Статус: пройдено локально

## Что проверяли

Эти тесты не являются полным fuzzing или внешним аудитом. Они закрывают базовые сценарии доступа, которые важны для объяснения безопасности обычному пользователю.

## Результат

```text
Ran 4 tests for test/AtlasAccessControl.t.sol:AtlasAccessControlTest
[PASS] testDailyRejectsClaimFromNonOwner()
[PASS] testLockupRejectsClaimFromNonOwner()
[PASS] testLockupRejectsDoubleClaim()
[PASS] testTransportClaimReferralIsOwnerOnly()

4 tests passed; 0 failed; 0 skipped
```

## Перевод на человеческий язык

### Чужой Lockup claim

Посторонний адрес не смог запросить выплату по Lockup-ордеру другого пользователя. Контракт остановил действие проверкой `Not the owner`.

### Повторный Lockup claim

После успешного claim повторный вызов по тому же ордеру не прошел. Контракт остановил действие состоянием `Order already claimed or not exist`.

### Чужой Daily claim

Посторонний адрес не смог запросить Daily-выплату по ордеру другого пользователя. Контракт остановил действие проверкой `Not the owner`.

### Transport только для owner

Посторонний адрес не смог вызвать `Transport.claimReferral`. Контракт остановил действие через `Ownable`.

## Что это доказывает

Эти тесты подтверждают базовую access-control защиту:

- пользовательский claim привязан к владельцу ордера;
- повторный Lockup claim не проходит;
- Transport не вызывается посторонним адресом.

## Что это не доказывает

- Это не доказывает полную безопасность экономической модели.
- Это не заменяет invariant fuzzing на тысячи случайных сценариев.
- Это не заменяет testnet battle test.
- Это не заменяет внешний аудит.

