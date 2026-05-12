import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

function ConversionFunnelChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart>
        <Tooltip contentStyle={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.12)" }} />
        <Funnel dataKey="value" data={data} isAnimationActive fill="#7c72ff">
          <LabelList position="right" fill="#d8e6ff" stroke="none" dataKey="stage" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

export default ConversionFunnelChart;
