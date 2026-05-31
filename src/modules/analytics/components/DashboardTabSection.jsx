import ChartCard from "./ChartCard";
import DashboardBalance from "./DashboardBalance";
import DashboardBlock from "./DashboardBlock";
import DashboardKpiCard from "./DashboardKpiCard";
import DashboardList from "./DashboardList";
import DashboardListRow from "./DashboardListRow";
import DashboardMiniTable from "./DashboardMiniTable";
import DashboardValue from "./DashboardValue";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import Wrapper from "./Wrapper";
import TrafficSourcesChart from "../charts/TrafficSourcesChart";
import UsersGrowthChart from "../charts/UsersGrowthChart";
import formatCurrency from "../utils/formatCurrency";

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export default function DashboardTabSection({
  data,
  overviewOperations,
  cashPosition,
  todaySnapshot,
  contractNetFlowToday,
  next72h,
  trafficTabData,
  reinvestCapitalRate,
  repeatDepositRate,
}) {
    const walletRows = (data.tabsData?.wallets?.rows || []).slice(0, 5);
    const geographyRows = (data.tabsData?.geography?.rows || []).slice(0, 5);
    const leaderRows = (data.tabsData?.leaders?.participation || []).slice(0, 5).map((row) => ({
      leader: row.name,
      inflow: row.investment,
      orders: row.cycles,
    }));
    const partnerRows = (data.tabsData?.partner?.rows || []).slice(0, 4);
    const dashboardCycleMix = Object.values(
      overviewOperations.cycleTypes.reduce((accumulator, row) => {
        const sourceKey = String(row.source || "").toLowerCase().includes("daily") ? "Daily Flow" : "Lockup";

        if (!accumulator[sourceKey]) {
          accumulator[sourceKey] = {
            source: sourceKey,
            incomingAmount: 0,
          };
        }

        accumulator[sourceKey].incomingAmount += Number(row.todayIncoming || 0);
        return accumulator;
      }, {}),
    );
    const dashboardKpis = [
      {
        kicker: "Пришло сегодня",
        value: formatCurrency(cashPosition.incomingFact ?? data.kpis.factToday),
        note: `↑ ${formatPercent(18.4)}`,
        sub: "vs вчера",
        tone: "in",
      },
      {
        kicker: "Выплачено сегодня",
        value: formatCurrency(cashPosition.outgoingFact ?? 0),
        note: `↑ ${formatPercent(12.7)}`,
        sub: "vs вчера",
        tone: "out",
      },
      {
        kicker: "Чистый поток",
        value: formatCurrency(contractNetFlowToday),
        note: `↑ ${formatPercent(32.1)}`,
        sub: "vs вчера",
        tone: "net",
      },
      {
        kicker: "Цель на сегодня",
        value: formatCurrency(data.kpis.targetToday),
        note: `${Math.max(0, Math.round((data.kpis.factToday / Math.max(data.kpis.targetToday, 1)) * 100))}%`,
        sub: "выполнено",
        tone: "target",
      },
      {
        kicker: "Первая дата риска",
        value: data.kpis.firstRiskDate === "без риска" ? "Без риска" : String(data.kpis.firstRiskDate).replace(/-/g, " "),
        note: data.kpis.firstRiskGap || "окно 72 часа",
        sub: "окно 72 часа",
        tone: "risk",
      },
    ];
    const cashRows = [
      ["Доступно в пуле", formatCurrency(cashPosition.closingBalance ?? cashPosition.availableCash ?? 0), "success"],
      ["Можно забрать сейчас", formatCurrency(data.kpis.claimableNow), "accent"],
      ["Начислено, но не выведено", formatCurrency(data.kpis.accruedLater), "accent"],
      ["Нужно добрать на 30 дней", formatCurrency(data.kpis.requiredNewMoney), "danger"],
      ["Покрытие ближайшего окна", `${((next72h[0]?.expectedIncoming || 0) / Math.max(next72h[0]?.totalOutgoing || 1, 1)).toFixed(2)}x`, "success"],
    ];
    const conversionRows = [
      ["Регистрации", trafficTabData.metrics.find((item) => item.title === "Регистрации сегодня")?.value || 0, "день"],
      ["Подключили кошелёк", trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.value || 0, trafficTabData.metrics.find((item) => item.title === "Подключили кошелёк")?.statusLabel || "0%"],
      ["Активировали цикл", trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.value || 0, trafficTabData.metrics.find((item) => item.title === "Активировали цикл")?.statusLabel || "0%"],
      ["Средний чек активации", formatCurrency((todaySnapshot?.incoming || 0) / Math.max(todaySnapshot?.cycleActivations || 1, 1)), "среднее"],
      ["Качество потока", formatPercent(53.8), "в активацию"],
    ];
    const next72hColumns = [
      { key: "period", label: "Период", render: (_row, index) => (index === 0 ? "Сегодня" : index === 1 ? "Завтра" : "День 3") },
      { key: "incoming", label: "Приток", render: (row) => formatCurrency(row.expectedIncoming) },
      { key: "outgoing", label: "Обязательства", render: (row) => formatCurrency(row.totalOutgoing) },
      {
        key: "coverage",
        label: "Покрытие",
        render: (row) => {
          const ratio = (row.expectedIncoming || 0) / Math.max(row.totalOutgoing || 1, 1);
          return <DashboardValue tone={ratio >= 1 ? "success" : "danger"}>{ratio.toFixed(2)}x</DashboardValue>;
        },
      },
    ];
    const cycleColumns = [
      { key: "cycleType", label: "Тариф" },
      { key: "share", label: "Доля", render: (row) => formatPercent((row.todayIncoming / Math.max(todaySnapshot?.incoming || 1, 1)) * 100) },
      { key: "monthCreated", label: "Активные" },
      { key: "averageAmount", label: "Ср. сумма", render: (row) => formatCurrency(row.todayIncoming / Math.max(row.todayCreated || 1, 1)) },
    ];

    return (
      <>
        <Wrapper as="section" marginTop="lg">
          <LayoutGrid columns="auto" gap="md">
            {dashboardKpis.map((item) => (
              <LayoutCell key={item.kicker}>
                <DashboardKpiCard {...item} />
              </LayoutCell>
            ))}
          </LayoutGrid>
        </Wrapper>

        <Wrapper as="section" marginTop="lg">
          <LayoutGrid columns="three" gap="md">
            <LayoutCell>
              <DashboardBlock title="Главная касса дня">
                <DashboardList>
                  {cashRows.map(([label, value, tone]) => (
                    <DashboardListRow key={label} label={label} value={value} tone={tone} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>

            <LayoutCell>
              <DashboardBlock title="Конверсия дня">
                <DashboardList>
                  {conversionRows.map(([label, value, delta]) => (
                    <DashboardListRow key={label} label={label} value={value} sub={delta} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>

            <LayoutCell>
              <DashboardBlock title="72 часа">
                <DashboardMiniTable
                  columns={next72hColumns}
                  getRowKey={(row) => row.date}
                  rows={next72h}
                />
              </DashboardBlock>
            </LayoutCell>
          </LayoutGrid>
        </Wrapper>

        <Wrapper as="section" marginTop="lg">
          <LayoutGrid columns="two" gap="md">
            <LayoutCell span="wide">
              <ChartCard title="Входящий vs исходящий поток" subtitle="Входящий поток, исходящий поток и чистый поток по дню.">
                <UsersGrowthChart data={data.charts.usersGrowth} />
              </ChartCard>
            </LayoutCell>
            <LayoutCell>
              <DashboardBlock title="Продукты / циклы">
                <Wrapper marginTop="sm">
                  <LayoutGrid columns="two" gap="md">
                  <LayoutCell>
                    <ChartCard title="Доли активных циклов" subtitle="Lockup vs Daily Flow.">
                      <TrafficSourcesChart data={dashboardCycleMix} />
                    </ChartCard>
                  </LayoutCell>
                  <LayoutCell>
                    <DashboardMiniTable
                      columns={cycleColumns}
                      getRowKey={(row) => row.cycleType}
                      rows={overviewOperations.cycleTypes.slice(0, 6)}
                    />
                  </LayoutCell>
                  </LayoutGrid>
                </Wrapper>
              </DashboardBlock>
            </LayoutCell>
          </LayoutGrid>
        </Wrapper>

        <Wrapper as="section" marginTop="lg">
          <LayoutGrid columns="three" gap="md">
            <LayoutCell>
              <DashboardBlock title="Новые vs повторные деньги">
                <DashboardBalance label="Всего за день" value={formatCurrency(todaySnapshot?.incoming || 0)} />
                <Wrapper marginTop="md">
                  <DashboardList>
                    <DashboardListRow label="Новые деньги" value={formatPercent(((todaySnapshot?.newMoney || 0) / Math.max(todaySnapshot?.incoming || 1, 1)) * 100)} tone="success" />
                    <DashboardListRow label="Повторные деньги" value={formatPercent(((todaySnapshot?.existingMoney || 0) / Math.max(todaySnapshot?.incoming || 1, 1)) * 100)} tone="accent" />
                  </DashboardList>
                </Wrapper>
              </DashboardBlock>
            </LayoutCell>

            <LayoutCell>
              <DashboardBlock title="Риск и обязательства">
                <DashboardList>
                  <DashboardListRow label="Обязательства 7 дней" value={formatCurrency(data.kpis.obligations7d)} />
                  <DashboardListRow label="Обязательства 30 дней" value={formatCurrency(data.kpis.obligations30d)} />
                  <DashboardListRow label="Давление выплат" value="76%" tone="danger" />
                  <DashboardListRow label="Ближайший риск" value={data.kpis.firstRiskGap || "3 дня"} tone="danger" />
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>

            <LayoutCell>
              <DashboardBlock title="Реинвест">
                <DashboardList>
                  <DashboardListRow label="Reinvest rate" value={formatPercent(reinvestCapitalRate)} tone="success" />
                  <DashboardListRow label="Доля повторных циклов" value={formatPercent(repeatDepositRate)} />
                  <DashboardListRow label="Возврат в систему" value="68.3/100" tone="success" />
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>
          </LayoutGrid>
        </Wrapper>

        <Wrapper as="section" marginTop="lg">
          <LayoutGrid columns="four" gap="md">
            <LayoutCell>
              <DashboardBlock title="Кошельки">
                <DashboardList>
                  {walletRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.wallet} label={row.wallet} value={formatCurrency(row.inflow)} sub={formatPercent(row.share)} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>

            <LayoutCell>
              <DashboardBlock title="География">
                <DashboardList>
                  {geographyRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.country} label={row.country} value={formatCurrency(row.inflow)} sub={formatPercent(row.share)} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>

            <LayoutCell>
              <DashboardBlock title="Лидеры">
                <DashboardList>
                  {leaderRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.leader} label={row.leader} value={formatCurrency(row.inflow)} sub={`${row.orders} циклов`} />
                  ))}
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>

            <LayoutCell>
              <DashboardBlock title="Партнёрская структура">
                <DashboardList>
                  {partnerRows.slice(0, 3).map((row) => (
                    <DashboardListRow key={row.branch} label={row.branch} value={formatCurrency(row.inflow)} sub={`${row.invited} приглаш.`} />
                  ))}
                  <DashboardListRow label="Риск перегруза" value="Высокий" tone="danger" />
                </DashboardList>
              </DashboardBlock>
            </LayoutCell>
          </LayoutGrid>
        </Wrapper>
      </>
    );
}
