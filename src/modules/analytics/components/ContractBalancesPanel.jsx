import { useEffect, useMemo, useState } from "react";

const CONTRACT_BALANCES_ENDPOINT = "/api/contracts/atlas-balances";
const CONTRACT_FLOWS_ENDPOINT = "/api/contracts/atlas-flows";

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
  const [flowSnapshot, setFlowSnapshot] = useState(null);
  const [status, setStatus] = useState("loading");
  const [flowStatus, setFlowStatus] = useState("loading");
  const [error, setError] = useState("");
  const [flowError, setFlowError] = useState("");
  const [copiedAddress, setCopiedAddress] = useState("");

  async function loadBalances() {
    setStatus("loading");
    setFlowStatus("loading");
    setError("");
    setFlowError("");
    try {
      const [balancesResponse, flowsResponse] = await Promise.all([
        fetch(CONTRACT_BALANCES_ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store" }),
        fetch(CONTRACT_FLOWS_ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store" }),
      ]);
      const balancesPayload = await balancesResponse.json().catch(() => ({}));
      const flowsPayload = await flowsResponse.json().catch(() => ({}));
      if (!balancesResponse.ok || balancesPayload?.ok === false) {
        throw new Error(balancesPayload?.error || "contract_balances_failed");
      }
      setSnapshot(balancesPayload);
      setStatus("ready");
      if (!flowsResponse.ok || flowsPayload?.ok === false) {
        setFlowSnapshot(null);
        setFlowStatus("error");
        setFlowError(flowsPayload?.error || "contract_flows_failed");
      } else {
        setFlowSnapshot(flowsPayload);
        setFlowStatus("ready");
      }
    } catch (loadError) {
      setStatus("error");
      setFlowStatus("error");
      setError(loadError?.message || "contract_balances_failed");
      setFlowError(loadError?.message || "contract_flows_failed");
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
    { label: "USDT на адресах сейчас", value: formatToken(snapshot?.totals?.usdt, "USDT"), note: "текущий остаток по рабочим контрактам" },
    { label: "BNB на адресах сейчас", value: formatToken(snapshot?.totals?.bnb, "BNB"), note: "native gas/liquidity balance" },
    { label: "Адреса с остатком", value: `${activeContracts} / ${contractRows.length}`, note: "где текущий USDT balance больше нуля" },
    { label: "Крупнейший баланс", value: largestContract?.name || "—", note: largestContract ? formatToken(largestContract.balances?.usdt, "USDT") : "нет данных" },
  ];
  const flowRows = flowSnapshot?.contracts || [];
  const flowStats = [
    { label: "Всего создали циклов", value: formatToken(flowSnapshot?.totals?.provided, "USDT"), note: "сумма Locked.amountLocked по Lockup/Daily" },
    { label: "Вывели участники", value: formatToken(flowSnapshot?.totals?.claimed, "USDT"), note: "сумма выплат пользователям по Claimed" },
    { label: "Fee / treasury", value: formatToken(flowSnapshot?.totals?.fee, "USDT"), note: "комиссия из событий Claimed" },
    { label: "Осталось по событиям", value: formatToken(flowSnapshot?.totals?.remaining, "USDT"), note: "создано циклов минус выплаты и fee" },
  ];

  return (
    <section className="analytics-contract-balances">
      <div className="analytics-contract-balances-hero analytics-surface">
        <div>
          <p className="analytics-kicker">BSC contracts / flows</p>
          <h2>Обороты и балансы официальных контрактов Atlas</h2>
            <p>
            Read-only мониторинг USDT по адресам из Transparency / BscScan Check. Обороты считаются по событиям
            Lockup Flow и Daily Flow: сколько создано циклов, сколько участники уже вывели и какой остаток
            получается по событиям контрактов.
          </p>
        </div>
        <div className={`analytics-contract-balances-state analytics-contract-balances-state-${status === "error" ? "danger" : "success"}`}>
          <span>{status === "loading" || flowStatus === "loading" ? "Обновляю" : status === "error" || flowStatus === "error" ? "Есть ошибка RPC" : "Live on-chain"}</span>
          <strong>{snapshot?.network?.name || "BNB Smart Chain"}</strong>
          <small>{snapshot ? `обновлено ${formatDateTime(snapshot.updatedAt)}` : "ожидание данных"}</small>
          <button type="button" className="analytics-parser-mini-button" onClick={loadBalances} disabled={status === "loading"}>
            {status === "loading" || flowStatus === "loading" ? "Загрузка..." : "Обновить"}
          </button>
        </div>
      </div>

      <section className="analytics-contract-balances-table analytics-surface">
        <div className="analytics-data-table-head">
          <div>
            <span className="analytics-kicker">Atlas USDT movement</span>
            <h2>Сколько всего вложили и вывели</h2>
            <p className="chart-card-subtitle">Считаем по событиям Locked/Claimed в пользовательских контрактах. Текущий баланс адресов ниже показывает, где USDT лежит прямо сейчас.</p>
          </div>
        </div>
        {flowError ? (
          <div className="analytics-contract-balances-error">
            <strong>Не удалось получить историю Transfer-логов</strong>
            <span>{flowError}. Нужен доступ к BscScan и BNB Chain RPC, чтобы прочитать список транзакций и receipt-события.</span>
          </div>
        ) : (
          <>
            <div className="analytics-contract-balances-grid">
              {flowStats.map((item) => (
                <article key={item.label} className="analytics-contract-balances-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </article>
              ))}
            </div>
            <div className="analytics-table-responsive">
              <table className="analytics-table analytics-contract-balances-table-grid analytics-contract-flows-table-grid">
                <thead>
                  <tr>
                    <th>Контракт</th>
                    <th>Создано циклов</th>
                    <th>Вывели участники</th>
                    <th>Fee</th>
                    <th>Остаток</th>
                    <th>Events</th>
                  </tr>
                </thead>
                <tbody>
                  {flowRows.map((contract) => (
                    <tr key={contract.id}>
                      <td>
                        <strong>{contract.name}</strong>
                        <span>{contract.shortAddress}</span>
                      </td>
                      <td><strong className="analytics-contract-balance analytics-contract-balance-success">{formatToken(contract.provided, "USDT")}</strong></td>
                      <td><strong className="analytics-contract-balance analytics-contract-balance-warning">{formatToken(contract.claimed, "USDT")}</strong></td>
                      <td>{formatToken(contract.fee, "USDT")}</td>
                      <td><strong className={`analytics-contract-balance analytics-contract-balance-${getBalanceTone(contract.remaining)}`}>{formatToken(contract.remaining, "USDT")}</strong></td>
                      <td>{contract.lockedEvents || 0} / {contract.claimedEvents || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

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
            <h2>Контракты и текущие остатки на адресах</h2>
            <p className="chart-card-subtitle">Это не исторический оборот и не TVL цикла, а live balanceOf по BNB Chain RPC.</p>
          </div>
        </div>
        <div className="analytics-table-responsive">
          <table className="analytics-table analytics-contract-balances-table-grid">
            <thead>
              <tr>
                <th>Контракт</th>
                <th>Назначение</th>
                <th>Адрес</th>
                <th>USDT сейчас</th>
                <th>BNB сейчас</th>
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
                      {formatToken(contract.balances?.usdt, "USDT")}
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
          <p>Это BEP-20 settlement asset. В таблице он тоже отображается числом, но общий USDT total считается по рабочим контрактам Atlas. Для оборота по Lockup/Daily нужен отдельный слой событий и транзакций, а не только текущий balanceOf.</p>
        </section>
      ) : null}
    </section>
  );
}
