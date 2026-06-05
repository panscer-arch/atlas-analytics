# Atlas System — Testnet Smoke Test Runbook

Версия: V1  
Дата: 2026-06-05  
Статус: подготовлено, выполняется после testnet deployment

## Цель

После deployment нужно проверить не только наличие адресов, но и то, что контракты реально отвечают, имеют правильные owner/treasury/tokenId и проходят базовые transaction-сценарии.

Smoke-test делится на два уровня:

1. Read-only smoke-test — можно выполнить сразу после заполнения registry.
2. Transaction smoke-test — выполняется testnet wallet-ами с test token и test BNB.

## Read-only smoke-test

Команда:

```text
./scripts/smoke-test-registry-readonly.sh
```

Что проверяется:

- у `UnityLockup`, `UnityDaily`, `Transport` есть bytecode;
- `owner()` читается;
- `treasury()` читается;
- `platformFee()` читается;
- `tokenId()` читается;
- `nextOrderId()` читается у Lockup/Daily.

Это подтверждает, что registry указывает на живые контракты, но еще не подтверждает рабочую claim-логику.

## Transaction smoke-test

Перед публичным challenge нужно вручную выполнить и записать tx hash:

| Сценарий | Ожидаемый результат | Tx hash |
| --- | --- | --- |
| Lockup create | ордер создан, `nextOrderId` увеличился | `[заполнить]` |
| Lockup claim before unlock | revert `Not yet time to claim` | `[заполнить]` |
| Lockup claim by non-owner | revert `Not the owner` | `[заполнить]` |
| Lockup claim by owner after unlock | success | `[заполнить]` |
| Lockup double claim | revert `Order already claimed or not exist` | `[заполнить]` |
| Daily create | ордер создан, `nextOrderId` увеличился | `[заполнить]` |
| Daily claim before 1 day | revert `No unclaimed rewards` | `[заполнить]` |
| Daily claim by non-owner | revert `Not the owner` | `[заполнить]` |
| Daily claim by owner after 1 day | success | `[заполнить]` |
| Daily second claim same day | revert `No unclaimed rewards` | `[заполнить]` |
| Transport claimReferral by non-owner | revert `Ownable: caller is not the owner` | `[заполнить]` |
| Transport claimReferral by owner | success | `[заполнить]` |

## Как публиковать результат

После выполнения smoke-test нужно:

1. Заполнить `smokeTests` в contract registry.
2. Добавить explorer links.
3. Обновить Security Review status:

```text
Testnet deployed, registry published, smoke-test completed.
```

## Что нельзя писать после одного smoke-test

Нельзя писать:

- `battle-tested`;
- `external challenge completed`;
- `no exploit found`.

Эти формулировки допустимы только после публичного BNB Testnet Battle Test и финального отчета.

