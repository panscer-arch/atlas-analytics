# Atlas System — Testnet Deployment Runbook

Версия: V1  
Дата: 2026-06-05  
Статус: готово к использованию, реальный deployment еще не выполнен

## Зачем нужен runbook

Этот документ переводит BNB Testnet Battle Kit в конкретные технические действия: какие переменные заполнить, какой командой развернуть контракты, как получить contract registry и что проверить перед открытием challenge.

## Важный нюанс по LP

`UnityLockup`, `UnityDaily` и `Transport` наследуют `PositionHandler`. Во время constructor контракт проверяет Pancake V3 `tokenId`:

- `tokenId` не должен быть 0;
- `MAIN_TOKEN_ADDRESS` должен быть одним из токенов NFT-позиции;
- NFT-позиция должна относиться к ожидаемому Pancake V3 pool;
- текущий tick должен быть на нужной стороне диапазона.

Поэтому нельзя честно развернуть battle-контракты только с произвольным mock USDT. Сначала нужна реальная Pancake V3 testnet NFT-position или отдельный mock-LP режим с измененным окружением.

## Файлы комплекта

- `.env.testnet.example` — шаблон переменных.
- `scripts/deploy-testnet-battle.sh` — deploy `UnityLockup`, `UnityDaily`, `Transport` через `forge create`.
- `scripts/verify-testnet-registry.sh` — проверка, что в registry адреса имеют bytecode.
- `testnet-contract-registry.generated.json` — создается после успешного deploy.

## Порядок запуска

1. Создать testnet wallet и пополнить test BNB.
2. Подготовить testnet token и Pancake V3 testnet NFT-position.
3. Заполнить `.env.testnet`.
4. Выполнить:

```text
./scripts/deploy-testnet-battle.sh
```

5. Проверить registry:

```text
./scripts/verify-testnet-registry.sh
```

6. Перенести адреса из `testnet-contract-registry.generated.json` в публичный registry.
7. Выполнить smoke-test транзакции:
   - Lockup create;
   - Daily create;
   - claim before time должен revert;
   - claim by owner должен пройти;
   - double claim должен revert;
   - non-owner claim должен revert;
   - Transport non-owner должен revert.
8. Только после этого открывать challenge window.

## Что считается закрытым после runbook

После успешного выполнения runbook можно писать:

```text
Testnet contracts deployed and registry published.
```

Нельзя писать:

```text
Battle-tested
```

пока не завершен внешний challenge и не опубликован final report.

