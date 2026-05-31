import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import RestoredHeroCard from "./RestoredHeroCard";
import RestoredSection from "./RestoredSection";
import formatCurrency from "../utils/formatCurrency";

export default function RestoredOverviewTab({ data }) {
  return (
    <>
      <RestoredSection
        eyebrow="База"
        title="Главные параметры системы"
        description="Система должна ежедневно видеть входящие деньги, будущие обязательства и потребность в новом притоке."
      >
        <LayoutGrid columns="three" gap="md">
          <LayoutCell>
            <RestoredHeroCard title="Главный KPI" value="Incoming Money" hint="Входящий поток" />
          </LayoutCell>
          <LayoutCell>
            <RestoredHeroCard title="Обязательства" value="Today / 7d / 30d" hint="Окна выплат" />
          </LayoutCell>
          <LayoutCell>
            <RestoredHeroCard title="План добора" value={formatCurrency(data.kpis.requiredNewMoney)} hint="Требуемый новый приток" />
          </LayoutCell>
        </LayoutGrid>
        <ul className="analytics-restored-list">
          <li>Система знает все user wallets, creator wallets, treasury wallets и движение денег по ним.</li>
          <li>Система знает все инвестиции, продукты, циклы, даты входов и ожидаемые выплаты.</li>
          <li>Система раскладывает приток на cycle payouts, referral, platform fee и operator net.</li>
        </ul>
      </RestoredSection>

      <RestoredSection
        eyebrow="Incoming vs Obligations"
        title="Сколько пришло и сколько нужно закрыть"
        description="Это главный управленческий слой старой версии."
      >
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <div className="analytics-surface analytics-restored-card">
              <h3 className="analytics-restored-card-title">Incoming block</h3>
              <div className="analytics-restored-metric-list">
                <div><span>Incoming Today</span><strong>{formatCurrency(data.kpis.factToday)}</strong></div>
                <div><span>Plan Today</span><strong>{formatCurrency(data.kpis.planToday)}</strong></div>
                <div><span>Fact Today</span><strong>{formatCurrency(data.kpis.factToday)}</strong></div>
                <div><span>Gap Today</span><strong>{formatCurrency(data.kpis.gapToday)}</strong></div>
                <div><span>Required Tomorrow</span><strong>{formatCurrency(data.kpis.targetTomorrow)}</strong></div>
              </div>
            </div>
          </LayoutCell>
          <LayoutCell>
            <div className="analytics-surface analytics-restored-card">
              <h3 className="analytics-restored-card-title">Obligations block</h3>
              <div className="analytics-restored-metric-list">
                <div><span>Выплаты сегодня</span><strong>{formatCurrency(data.kpis.paidToday || data.kpis.outgoingToday || data.kpis.cashPosition?.outgoingFact || 0)}</strong></div>
                <div><span>Выплаты на 7 дней</span><strong>{formatCurrency(data.kpis.obligations7d)}</strong></div>
                <div><span>Выплаты на 30 дней</span><strong>{formatCurrency(data.kpis.obligations30d)}</strong></div>
                <div><span>Уже выплачено</span><strong>{formatCurrency(data.kpis.paidTotal || 0)}</strong></div>
                <div><span>Ещё не выплачено</span><strong>{formatCurrency(data.kpis.unpaidTotal || data.kpis.obligations30d)}</strong></div>
              </div>
            </div>
          </LayoutCell>
        </LayoutGrid>
      </RestoredSection>

      <RestoredSection
        eyebrow="Breakdown & Forecast"
        title="Куда уйдут деньги и где первая дата риска"
        description="Прогноз должен объяснять не только сумму потребности, но и её структуру."
      >
        <div className="analytics-restored-pill-row">
          <span className="analytics-restored-pill">Cycle Payouts: {formatCurrency(data.kpis.obligations7d)}</span>
          <span className="analytics-restored-pill">Referral Burden: {formatCurrency(data.kpis.referralBurden)}</span>
          <span className="analytics-restored-pill">Platform Fee: {formatCurrency(data.kpis.platformFee)}</span>
          <span className="analytics-restored-pill">Operator Net: {formatCurrency(data.kpis.operatorNet)}</span>
          <span className="analytics-restored-pill">First Risk Date: {data.kpis.firstRiskDate}</span>
          <span className="analytics-restored-pill">Projected Gap: {formatCurrency(data.kpis.firstRiskGap || data.kpis.gapToday)}</span>
        </div>
      </RestoredSection>

      <RestoredSection
        eyebrow="Alerts & Recommendations"
        title="Жёсткие сигналы и действия для оператора"
        description="Система должна не просто показывать цифры, а подсказывать, где уже есть просадка."
      >
        <LayoutGrid columns="two" gap="md">
          <LayoutCell>
            <div className="analytics-surface analytics-restored-alert analytics-restored-card">
              <h3 className="analytics-restored-card-title">Жёсткие сигналы</h3>
              <ul className="analytics-restored-list">
                {(data.insights?.alerts || []).map((item) => (
                  <li key={item.title}><strong>{item.title}</strong> - {item.description}</li>
                ))}
              </ul>
            </div>
          </LayoutCell>
          <LayoutCell>
            <div className="analytics-surface analytics-restored-warn analytics-restored-card">
              <h3 className="analytics-restored-card-title">Действия для оператора</h3>
              <ul className="analytics-restored-list">
                {(data.priorityActions || []).slice(0, 5).map((item) => (
                  <li key={item.title}><strong>{item.title}</strong> - {item.description}</li>
                ))}
              </ul>
            </div>
          </LayoutCell>
        </LayoutGrid>
      </RestoredSection>
    </>
  );
}
