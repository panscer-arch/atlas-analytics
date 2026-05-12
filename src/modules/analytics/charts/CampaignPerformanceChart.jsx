import { CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar, Line } from "recharts";

function CampaignPerformanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="campaign" stroke="#93a7c3" tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" stroke="#93a7c3" tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" stroke="#93a7c3" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.12)" }} />
        <Legend />
        <Bar yAxisId="left" dataKey="revenue" fill="#3dd9b3" radius={[8, 8, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#ff6b8a" strokeWidth={3} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default CampaignPerformanceChart;
