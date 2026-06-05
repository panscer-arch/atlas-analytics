# Atlas System — Aderyn human-readable summary

Версия: V1  
Дата: 2026-06-05  
Инструмент: Aderyn 0.6.8

## Что было запущено

Aderyn был установлен локально через npm-пакет `@cyfrin/aderyn` и запущен двумя способами:

```text
aderyn . --src contracts --output aderyn-report.md
```

и отдельно по core-контрактам:

```text
aderyn . --src contracts --path-includes contracts/Transport.sol,contracts/UnityDaily.sol,contracts/UnityLockup.sol,contracts/PositionHandler.sol --output aderyn-core-report.md
```

## Что выдала программа по core-контрактам

```text
.sol Files: 4
Total nSLOC: 448
High Issues: 2
Low Issues: 6
```

## Перевод на человеческий язык

### H-1: ETH transferred without address checks

Aderyn отметил `lockup`-функции в UnityLockup и UnityDaily.

Человеческий перевод: инструмент видит пользовательскую функцию, куда может прийти внешний адрес, и предлагает дополнительно убедиться, что получатель/инициатор операции контролируется ожидаемой логикой.

Ручная интерпретация: в этих функциях нет ETH-выплаты пользователю напрямую; логика работает с ERC20 и Pancake V3. При этом сигнал полезен как повод отдельно проверить flow `msg.sender -> order.owner -> claim`.

Что уже проверено: Foundry-тесты подтверждают, что чужой claim не проходит.

### H-2: Reentrancy: State change after external call

Aderyn отметил конструктор PositionHandler, где до записи части состояния вызываются внешние контракты `token.decimals()` и `nfpm.positions(tokenId_)`.

Человеческий перевод: программа предупреждает, что внешние вызовы до изменения состояния требуют ручной проверки.

Ручная интерпретация: это происходит в constructor, а не в обычной пользовательской функции после деплоя. Тем не менее это важный сигнал для deployment-review: token и NFT-position должны быть доверенными и заранее проверенными.

### L-1: Centralization Risk

Aderyn отметил owner-полномочия в Transport, UnityLockup и UnityDaily.

Человеческий перевод: владелец контракта имеет административные функции и должен быть раскрыт отдельно как архитектурный риск.

Что сделано: подготовлен отдельный документ `Owner Powers Disclosure`.

### L-2/L-3/L-4/L-5/L-6

Остальные low-сигналы относятся к качеству кода, событиям, unchecked return, unsafe ERC20 operation и плавающей версии Solidity.

Человеческий перевод: это не означает найденный exploit, но эти пункты стоит разобрать перед финальным внешним аудитом, чтобы отчет был чище.

## Корректный публичный вывод

Aderyn не дал статус “безопасно”. Он дал список сигналов для ручной проверки. На текущем этапе корректно писать:

```text
Aderyn static analysis выполнен. Найденные сигналы разобраны в human-readable summary. Часть сигналов относится к архитектурным и deployment-рискам, часть требует дальнейшего review перед внешним аудитом.
```

## Что нельзя писать

- Нельзя писать, что Aderyn подтвердил отсутствие рисков.
- Нельзя писать `Audited`.
- Нельзя писать `No issues`.

