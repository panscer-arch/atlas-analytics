import MetricsGrid from "./MetricsGrid";
import LayoutGrid, { LayoutCell } from "./LayoutGrid";
import ProductHeroCard from "./ProductHeroCard";
import ProductTierCard from "./ProductTierCard";
import ProductsSummaryTable from "./ProductsSummaryTable";
import SectionHeading from "./SectionHeading";
import TabSummary from "./TabSummary";
import Wrapper from "./Wrapper";

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
      <Wrapper as="section" marginTop="lg">
        <TabSummary
          kicker="Продукты"
          title={summary.title}
          description={summary.description}
          bullets={summary.bullets}
        />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Продукты / Циклы" title="Какой продукт даёт приток и какой создаёт давление" />
        <MetricsGrid metrics={productsTabData.metrics || []} density="half" />
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Lockup" title="Lockup тарифы" />
        <LayoutGrid columns="three" gap="md">
          {lockupRows.map((row) => (
            <LayoutCell key={row.tariff}>
              <ProductTierCard row={row} />
            </LayoutCell>
          ))}
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="lg">
        <SectionHeading kicker="Daily Flow" title="Daily Flow тарифы" />
        <LayoutGrid columns="two" gap="md">
          {dailyRows.map((row) => (
            <LayoutCell key={row.tariff}>
              <ProductHeroCard row={row} />
            </LayoutCell>
          ))}
        </LayoutGrid>
      </Wrapper>
      <Wrapper as="section" marginTop="sm">
        <ProductsSummaryTable rows={rows} />
      </Wrapper>
    </>
  );
}

export default ProductsTabSection;
