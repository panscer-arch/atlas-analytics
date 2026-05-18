import MetricsGrid from "./MetricsGrid";
import ProductHeroCard from "./ProductHeroCard";
import ProductTierCard from "./ProductTierCard";
import ProductsSummaryTable from "./ProductsSummaryTable";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";

function ProductsTabSection({ productsTabData }) {
  const rows = productsTabData.rows || [];
  const summary = productsTabData.summary || {
    title: "Продукты и циклы",
    description: "Смотрим, какие тарифы дают приток, где копятся обязательства и где появляется давление на пул.",
    bullets: [],
  };
  const lockupRows = rows.filter((row) => row.source === "Lockup");
  const dailyRows = rows.filter((row) => row.source === "Daily Flow");

  return (
    <>
      <TabSummary
        kicker="Продукты"
        title={summary.title}
        description={summary.description}
        bullets={summary.bullets}
      />
      <section className="mt-4">
        <SectionHeading kicker="Продукты / Циклы" title="Какой продукт даёт приток и какой создаёт давление" />
        <MetricsGrid metrics={productsTabData.metrics || []} density="half" />
      </section>
      <section className="mt-4">
        <SectionHeading kicker="Lockup" title="Lockup тарифы" />
        <div className="row g-3">
          {lockupRows.map((row) => (
            <div key={row.tariff} className="col-12 col-md-6 col-xxl-4">
              <ProductTierCard row={row} />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-4">
        <SectionHeading kicker="Daily Flow" title="Daily Flow тарифы" />
        <div className="row g-3">
          {dailyRows.map((row) => (
            <div key={row.tariff} className="col-12 col-xl-6">
              <ProductHeroCard row={row} />
            </div>
          ))}
        </div>
      </section>
      <section className="row g-3 mt-1">
        <div className="col-12">
          <ProductsSummaryTable rows={rows} />
        </div>
      </section>
    </>
  );
}

export default ProductsTabSection;
