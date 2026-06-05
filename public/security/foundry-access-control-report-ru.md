# Atlas System — Foundry access-control tests

Версия: V1  
Дата: 2026-06-05  
Статус: пройдено локально

## Что проверяли

Эти тесты не являются полным fuzzing или внешним аудитом. Они закрывают базовые сценарии доступа, которые важны для объяснения безопасности обычному пользователю.

## Результат

```text
Ran 6 tests for test/AtlasAccessControl.t.sol:AtlasAccessControlTest
[PASS] testDailyRejectsClaimFromNonOwner()
[PASS] testFuzzLockupRejectsClaimFromNonOwner(uint96,uint8,address)
[PASS] testFuzzTransportClaimReferralIsOwnerOnly(address,address,uint96)
[PASS] testLockupRejectsClaimFromNonOwner()
[PASS] testLockupRejectsDoubleClaim()
[PASS] testTransportClaimReferralIsOwnerOnly()

6 tests passed; 0 failed; 0 skipped
```

Отдельный прогон:

```text
forge test -vv --fuzz-runs 1000

6 tests passed; 0 failed; 0 skipped
Fuzz-сценарии: 1000 runs
```

## Перевод на человеческий язык

### Чужой Lockup claim

Посторонний адрес не смог запросить выплату по Lockup-ордеру другого пользователя. Контракт остановил действие проверкой `Not the owner`.

### Повторный Lockup claim

После успешного claim повторный вызов по тому же ордеру не прошел. Контракт остановил действие состоянием `Order already claimed or not exist`.

Важно: этот тест проверяет именно запрет повторного claim. Он использует текущую code-level сумму Lockup Launch (`100.03` при `100` principal) и не утверждает публичную тарифную модель. Тарифное расхождение вынесено отдельно в Product / Contract Consistency Review.

### Чужой Daily claim

Посторонний адрес не смог запросить Daily-выплату по ордеру другого пользователя. Контракт остановил действие проверкой `Not the owner`.

### Transport только для owner

Посторонний адрес не смог вызвать `Transport.claimReferral`. Контракт остановил действие через `Ownable`.

### Fuzz: чужой Lockup claim

Foundry прогнал случайные суммы, тарифы и адреса атакующего. В каждом сценарии адрес, не являющийся владельцем ордера, не смог выполнить claim.

### Fuzz: Transport owner-only

Foundry прогнал случайные адреса вызывающего, получателя и суммы. В каждом сценарии не-owner адрес не смог вызвать `Transport.claimReferral`.

## Что это доказывает

Эти тесты подтверждают базовую access-control защиту:

- пользовательский claim привязан к владельцу ордера;
- повторный Lockup claim не проходит;
- Transport не вызывается посторонним адресом.
- базовые access-control свойства сохраняются на fuzz-наборе случайных входных данных.

## Что это не доказывает

- Это не доказывает полную безопасность экономической модели.
- Accounting invariant checks выполнены отдельно; этот access-control отчет сам по себе не заменяет LP-testnet и публичный battle test.
- Это не заменяет LP-testnet и реальные testnet-транзакции. Daily/Transport stress вынесен в отдельный Foundry report.
- Это не заменяет testnet battle test.
- Это не заменяет внешний аудит.
