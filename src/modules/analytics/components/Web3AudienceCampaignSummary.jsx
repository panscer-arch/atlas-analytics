import { atlasAudienceStrategies, walletAudienceSnapshot } from "../data/web3AudienceCampaignData";

function StrategyCard({ strategy, index }) {
  return (
    <article className="analytics-web3-strategy-card">
      <header>
        <span>Стратегия {index + 1}</span>
        <small>{strategy.eyebrow}</small>
        <h3>{strategy.title}</h3>
      </header>

      <div className="analytics-web3-strategy-copy">
        <p><strong>Кого привлекаем.</strong> {strategy.audience}</p>
        <p><strong>Как объясняем Atlas.</strong> {strategy.promise}</p>
      </div>

      <div className="analytics-web3-strategy-columns">
        <section>
          <h4>Каналы</h4>
          <ul>{strategy.channels.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section>
          <h4>Воронка</h4>
          <ol>{strategy.funnel.map((item) => <li key={item}>{item}</li>)}</ol>
        </section>
        <section>
          <h4>KPI</h4>
          <ul>{strategy.kpis.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <p className="analytics-web3-guardrail"><strong>Ограничение:</strong> {strategy.guardrail}</p>
    </article>
  );
}

export default function Web3AudienceCampaignSummary() {
  return (
    <section className="analytics-web3-campaign-summary">
      <div className="analytics-web3-audience-hero analytics-surface">
        <div className="analytics-web3-audience-hero-copy">
          <p className="analytics-kicker">Atlas acquisition / wallet intelligence</p>
          <h2>{walletAudienceSnapshot.title}</h2>
          <p>{walletAudienceSnapshot.description}</p>
          <div className="analytics-web3-audience-meta">
            <span>{walletAudienceSnapshot.asOf}</span>
            <strong>{walletAudienceSnapshot.status}</strong>
          </div>
        </div>

        <div className="analytics-web3-audience-stats">
          {walletAudienceSnapshot.stats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.note}</small>
            </article>
          ))}
        </div>

        <div className="analytics-web3-audience-workflow" aria-label="Порядок подготовки wallet-аудитории">
          {walletAudienceSnapshot.workflow.map((step) => (
            <article key={step.label}>
              <span>{step.status}</span>
              <strong>{step.label}</strong>
              <small>{step.note}</small>
            </article>
          ))}
        </div>

        <p className="analytics-web3-audience-caveat"><strong>Перед запуском:</strong> {walletAudienceSnapshot.caveat}</p>

        <details className="analytics-web3-glossary">
          <summary>Термины простыми словами</summary>
          <dl>
            {walletAudienceSnapshot.glossary.map(([term, definition]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>

      <div className="analytics-web3-strategy-grid">
        {atlasAudienceStrategies.map((strategy, index) => (
          <StrategyCard key={strategy.id} strategy={strategy} index={index} />
        ))}
      </div>
    </section>
  );
}
