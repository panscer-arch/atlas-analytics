import { useEffect, useMemo, useState } from "react";

const POOL_ENDPOINT = "/api/pools/pancake-usdt-usdc";

function formatUsd(value = 0, compact = true) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? "compact" : "standard",
  }).format(Number(value) || 0);
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function formatPercent(value = 0) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 4 }).format(Number(value) || 0)}%`;
}

function formatDateTime(value = "") {
  if (!value) return "нет данных";
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function getPoolTone(pool) {
  if (!pool) return "default";
  if (pool.prices?.parityDeviationPct >= 0.5) return "danger";
  if (pool.reserveUsd < 10_000_000) return "warning";
  return "success";
}

export default function PoolMonitorPanel() {
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  async function loadPool() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch(POOL_ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "pool_snapshot_failed");
      }
      setSnapshot(payload.pool);
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(loadError?.message || "pool_snapshot_failed");
    }
  }

  useEffect(() => {
    loadPool();
  }, []);

  const healthTone = getPoolTone(snapshot);
  const stats = useMemo(() => ([
    { label: "Liquidity", value: formatUsd(snapshot?.reserveUsd), note: "reserve in USD" },
    { label: "Volume 24h", value: formatUsd(snapshot?.volumeUsd?.h24), note: `${formatNumber(snapshot?.transactions?.h24)} txns` },
    { label: "USDT/USDC", value: snapshot?.prices?.baseToQuote ? snapshot.prices.baseToQuote.toFixed(6) : "—", note: `deviation ${formatPercent(snapshot?.prices?.parityDeviationPct)}` },
    { label: "GT score", value: snapshot?.security?.gtScore || "—", note: "средний score токенов" },
  ]), [snapshot]);

  return (
    <section className="analytics-pool-monitor">
      <div className="analytics-pool-monitor-hero analytics-surface">
        <div>
          <p className="analytics-kicker">Pool Monitor / API</p>
          <h2>PancakeSwap USDT / USDC</h2>
          <p>
            Read-only подключение к пулу через GeckoTerminal API. Используем для мониторинга ликвидности,
            объёма, дисбаланса пары и быстрых ссылок на on-chain источники.
          </p>
        </div>
        <div className={`analytics-pool-monitor-state analytics-pool-monitor-state-${healthTone}`}>
          <span>{status === "loading" ? "Обновляю" : status === "error" ? "Ошибка API" : "Live API"}</span>
          <strong>{snapshot?.name || "USDT / USDC 0.01%"}</strong>
          <small>{snapshot ? `обновлено ${formatDateTime(snapshot.updatedAt)}` : "ожидание данных"}</small>
          <button type="button" className="analytics-parser-mini-button" onClick={loadPool} disabled={status === "loading"}>
            {status === "loading" ? "Загрузка..." : "Обновить"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="analytics-pool-monitor-error analytics-surface">
          <strong>Не удалось получить данные пула</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="analytics-pool-monitor-grid">
        {stats.map((item) => (
          <article key={item.label} className="analytics-pool-monitor-card analytics-surface">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>

      <section className="analytics-pool-monitor-details analytics-surface">
        <div>
          <p className="analytics-kicker">Pool details</p>
          <h3>{snapshot?.dex || "PancakeSwap V3 (BSC)"}</h3>
          <dl>
            <div><dt>Network</dt><dd>{snapshot?.network?.toUpperCase() || "BSC"}</dd></div>
            <div><dt>Pool address</dt><dd>{snapshot?.address || "0x92b7807bF19b7DDdf89b706143896d05228f3121"}</dd></div>
            <div><dt>Fee tier</dt><dd>{formatPercent(snapshot?.feePercentage)}</dd></div>
            <div><dt>Created</dt><dd>{formatDateTime(snapshot?.createdAt)}</dd></div>
            <div><dt>24h buys / sells</dt><dd>{formatNumber(snapshot?.transactions?.h24Buys)} / {formatNumber(snapshot?.transactions?.h24Sells)}</dd></div>
            <div><dt>1h volume</dt><dd>{formatUsd(snapshot?.volumeUsd?.h1, false)}</dd></div>
          </dl>
        </div>
        <div className="analytics-pool-monitor-tokens">
          {[snapshot?.tokens?.base, snapshot?.tokens?.quote].filter(Boolean).map((token) => (
            <article key={token.address || token.symbol}>
              {token.imageUrl ? <img src={token.imageUrl} alt="" /> : null}
              <div>
                <strong>{token.symbol}</strong>
                <span>{token.name}</span>
                <small>{token.address}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      {snapshot?.links ? (
        <section className="analytics-pool-monitor-links analytics-surface">
          <a href={snapshot.links.geckoTerminal} target="_blank" rel="noreferrer">GeckoTerminal</a>
          <a href={snapshot.links.pancakeSwap} target="_blank" rel="noreferrer">PancakeSwap</a>
          <a href={snapshot.links.bscScan} target="_blank" rel="noreferrer">BscScan</a>
          <a href={snapshot.links.arkham} target="_blank" rel="noreferrer">Arkham</a>
        </section>
      ) : null}
    </section>
  );
}
