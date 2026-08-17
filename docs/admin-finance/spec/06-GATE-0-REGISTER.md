# Atlas Admin: единый реестр Gate 0

Разработка production-расчётов начинается после закрытия обязательных решений.
У каждой строки должен быть владелец, утверждающий, ссылка на доказательство и дата.

| ID | Решение | Владелец | Утверждает | Требуемое доказательство | Статус |
| --- | --- | --- | --- | --- | --- |
| G0-01 | Адреса contracts, proxy/implementation и effective block ranges | Smart Contract | CTO + Finance | signed registry, ABI, deployment tx | OPEN |
| G0-02 | Controlled address registry и денежные perimeters | Finance/Data | CFO | versioned address registry | OPEN - EVIDENCE READY |
| G0-03 | Rulesets: Delta, Partner Reward, Platform Fee, rounding | Product/Contract | Owner + Finance | examples + golden fixtures | OPEN |
| G0-04 | Cycle и claim lifecycle, correction/reversal/expiry | Product/Data | Owner | state diagram + event mapping | OPEN |
| G0-05 | Finality/reorg policy и независимые RPC providers | Data/Security | CTO | runbook + reorg tests | OPEN |
| G0-06 | Контракт `data.atlas-system.io` | Provider/Data | CTO + Data owner | ODCS/OpenAPI, schemas, sandbox | OPEN |
| G0-07 | Source-of-truth matrix по каждому полю и метрике | Data/Finance | CFO | source catalog + lineage | OPEN |
| G0-08 | Reserve policy и forecast scenarios | Finance | CFO + Owner | versioned policy and limits | OPEN |
| G0-09 | SLA freshness, partial/stale/error semantics | Data/Product | CTO | acceptance criteria | OPEN |
| G0-10 | Admin roles, field masking и step-up actions | Security/Product | CTO + Owner | permission matrix + negative tests | OPEN |
| G0-11 | Retention, audit, exports и privacy policy | Security/Legal | Owner | approved policies | OPEN |
| G0-12 | Canonical Admin API `/api/admin/v1` | Backend/Data | CTO | runtime schemas + generated OpenAPI | OPEN |
| G0-13 | Money wire format | Backend/Data | Finance | `{amountRaw, decimals, tokenAddress, displayAmount}` | OPEN |
| G0-14 | Backup RPO/RTO и restore procedure | Infrastructure | CTO | successful restore evidence | OPEN |

## Правило закрытия

`DONE` разрешён только при наличии проверяемого артефакта. Устное подтверждение,
макет, mock API или успешная frontend-сборка не закрывают Gate 0.

По G0-02 подготовлен machine-readable кандидат
`contracts/controlled-address-registry.v1.json`: адреса из официального реестра
сверены с публичным provider и независимо прочитаны из BNB Chain на block
`114407352`. Зафиксированы owner/treasury/fee/tokenId, runtime code hashes,
права на LP-NFT и расхождение owner Daily Flow после публикации PDF. Gate
остаётся OPEN до формального утверждения периметров Finance и владельцем.

## Порядок

1. Сначала G0-01..G0-07: без них нельзя строить canonical ledger.
2. Параллельно G0-10, G0-11 и G0-14: безопасность не переносится на конец.
3. Затем G0-08, G0-09, G0-12 и G0-13.
4. После закрытия реестра создаётся подписанный baseline `gate0-v1`.
