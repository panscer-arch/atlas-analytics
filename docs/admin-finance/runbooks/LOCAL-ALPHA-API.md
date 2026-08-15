# Локальный Atlas Admin Finance Internal Alpha

Этот режим читает публичные Atlas on-chain aggregates только server-to-server,
проверяет block/hash/finality независимым BSC RPC и никогда не подставляет demo
fixtures при ошибке.

## Обязательные переменные

```bash
export ATLAS_ADMIN_FINANCE_MODE=alpha
export ATLAS_ADMIN_FINANCE_AUTH_MODE=session
export ATLAS_ADMIN_FINANCE_SESSION_TOKEN="$(openssl rand -hex 32)"
export ATLAS_ADMIN_FINANCE_CURSOR_SECRET="$(openssl rand -hex 32)"
export ATLAS_ADMIN_FINANCE_ALLOWED_ORIGINS="http://127.0.0.1:4187"
export ATLAS_ADMIN_FINANCE_RPC_URL="https://<approved-rpc-host>/"
export ATLAS_ADMIN_FINANCE_RPC_HOSTS="<approved-rpc-host>"
export ATLAS_ADMIN_FINANCE_CONTRACT_ADDRESSES="<approved-address-1>,<approved-address-2>"
```

Flow/balance endpoints по умолчанию ограничены точными HTTPS paths на
`supersussystem.com`. Для другого provider нужно явно задать URL и exact host
allowlist. Секреты и полный registry нельзя коммитить в репозиторий.

## Запуск

```bash
npm run api:admin-finance
```

Во втором терминале:

```bash
VITE_ADMIN_FINANCE_DATA_SOURCE=api \
VITE_ADMIN_FINANCE_RELEASE_SCOPE=mvp \
ATLAS_ADMIN_FINANCE_CAPTURE_SESSION="$ATLAS_ADMIN_FINANCE_SESSION_TOKEN" \
npm run dev -- --host 127.0.0.1 --port 4187
```

`ATLAS_ADMIN_FINANCE_CAPTURE_SESSION` допустим только для локальной QA через
Vite proxy. На staging/production cookie выдаёт OIDC/BFF слой.

## Проверка

```bash
npm run test:admin-finance
```

При установленном bundled Playwright и запущенных API/frontend:

```bash
NODE_PATH="$CODEX_NODE_MODULES" node scripts/qa-admin-finance-alpha.mjs
```

QA требует пять вкладок, HTTP 200, отсутствие demo claims, console errors и
page overflow. Скриншоты сохраняются в `artifacts/admin-finance-alpha`.

## Ликвидность

Если RPC поддерживает historical state, provider делает USDT `balanceOf` для
каждого controlled address на том же block tag и помечает checkpoint как
`independent_rpc`. Если RPC отвечает `missing trie node` или не возвращает
historical state, Internal Alpha остаётся доступным, но:

- current balance показывается как `REPORTED · UNVERIFIED`;
- canonical balance, expected ledger и residual показываются как `N/A`;
- в partial reasons добавляется отсутствие historical RPC;
- статус `reconciled` невозможен.

## Не является GO

Локальный HTTP 200 не заменяет controlled-address approval, production OIDC,
archive RPC SLA, staging negative tests, backup/restore smoke и Finance UAT.
