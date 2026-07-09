import { useEffect, useMemo, useState } from "react";

const CONTRACT_BALANCES_ENDPOINT = "/api/contracts/atlas-balances";

function formatToken(value = 0, symbol = "") {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: value >= 100 ? 2 : 6,
  }).format(Number(value) || 0)}${symbol ? ` ${symbol}` : ""}`;
}

function formatDateTime(value = "") {
  if (!value) return "нет данных";
  return new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

function getBalanceTone(value = 0) {
  if (value > 1000) return "success";
  if (value > 0) return "warning";
  return "default";
}

export default function ContractBalancesPanel() {
  const [snapshot, setSnapshot] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [copiedAddress, setCopiedAddress] = useState("");

  async function loadBalances() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch(CONTRACT_BALANCES_ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || "contract_balances_failed");
      }
      setSnapshot(payload);
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(loadError?.message || "contract_balances_failed");
    }
  }

  async function copyAddress(address = "") {
    if (!address || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      window.setTimeout(() => setCopiedAddress(""), 1200);
    } catch {
      setCopiedAddress("");
    }
  }

  useEffect(() => {
    loadBalances();
  }, []);

  const contracts = snapshot?.contracts || [];
  const contractRows = useMemo(
    () => contracts.filter((item) => !item.isToken),
    [contracts],
  );
  const activeContracts = contractRows.filter((item) => Number(item.balances?.usdt || 0) > 0).length;
  const largestContract = contractRows.reduce((leader, item) => (
    Number(item.balances?.usdt || 0) > Number(leader?.balances?.usdt || 0) ? item : leader
  ), null);
  const usdtToken = contracts.find((item) => item.isToken);

  const stats = [
    { label: "USDT на контрактах", value: formatToken(snapshot?.totals?.usdt, "USDT"), note: "сумма по official contracts" },
    { label: "BNB на адресах", value: formatToken(snapshot?.totals?.bnb, "BNB"), note: "native gas/liquidity balance" },
    { label: "Активные адреса", value: `${activeContracts} / ${contractRows.length}`, note: "где USDT balance больше нуля" },
    { label: "Крупнейший баланс", value: largestContract?.name || "—", note: largestContract ? formatToken(largestContract.balances?.usdt, "USDT") : "нет данных" },
  ];

  return (
    <section className="analytics-contract-balances">
      <div className="analytics-contract-balances-hero analytics-surface">
        <div>
          <p className="analytics-kicker">BSC contracts / balances</p>
          <h2>Балансы официальных контрактов Atlas</h2>
          <p>
            Read-only мониторинг адресов из Transparency / BscScan Check. Балансы считаются через BNB Chain RPC,
            а внешние ссылки ведут на BscScan и Arkham для ручной проверки.
          </p>
        </div>
        <div className={`analytics-contract-balances-state analytics-contract-balances-state-${status === "error" ? "danger" : "success"}`}>
          <span>{status === "loading" ? "Обновляю" : status === "error" ? "Ошибка RPC" : "Live on-chain"}</span>
          <strong>{snapshot?.network?.name || "BNB Smart Chain"}</strong>
          <small>{snapshot ? `обновлено ${formatDateTime(snapshot.updatedAt)}` : "ожидание данных"}</small>
          <button type="button" className="analytics-parser-mini-button" onClick={loadBalances} disabled={status === "loading"}>
            {status === "loading" ? "Загрузка..." : "Обновить"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="analytics-contract-balances-error analytics-surface">
          <strong>Не удалось получить on-chain балансы</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="analytics-contract-balances-grid">
        {stats.map((item) => (
          <article key={item.label} className="analytics-contract-balances-card analytics-surface">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>

      <section className="analytics-contract-balances-table analytics-surface">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Official Atlas contracts</span>
            <h2>Контракты и текущие балансы</h2>
            <p className="chart-card-subtitle">Адреса синхронизированы со списком на странице Smart Cycle 1.</p>
          </div>
        </div>
        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-contract-balances-table-grid">
            <thead>
              <tr>
                <th>Контракт</th>
                <th>Назначение</th>
                <th>Адрес</th>
                <th>USDT balance</th>
                <th>BNB balance</th>
                <th>Проверка</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id}>
                  <td>
                    <strong>{contract.name}</strong>
                    <span>{contract.type}</span>
                  </td>
                  <td>{contract.description}</td>
                  <td>
                    <button type="button" className="analytics-contract-address" onClick={() => copyAddress(contract.address)}>
                      {contract.shortAddress}
                    </button>
                    {copiedAddress === contract.address ? <small className="analytics-contract-copied">скопировано</small> : null}
                  </td>
                  <td>
                    <strong className={`analytics-contract-balance analytics-contract-balance-${getBalanceTone(contract.balances?.usdt)}`}>
                      {contract.isToken ? "—" : formatToken(contract.balances?.usdt, "USDT")}
                    </strong>
                  </td>
                  <td>{formatToken(contract.balances?.bnb, "BNB")}</td>
                  <td>
                    <div className="analytics-contract-links">
                      <a href={contract.links?.bscScan} target="_blank" rel="noreferrer">BscScan</a>
                      <a href={contract.links?.arkham} target="_blank" rel="noreferrer">Arkham</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {usdtToken ? (
        <section className="analytics-contract-balances-note analytics-surface">
          <strong>USDT Token</strong>
          <span>{usdtToken.address}</span>
          <p>Это BEP-20 settlement asset. Для него показываем адрес и BNB balance, а USDT balance по самому токену не суммируем.</p>
        </section>
      ) : null}
    </section>
  );
}
