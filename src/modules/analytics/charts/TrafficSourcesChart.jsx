import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#5ea6ff", "#7c72ff", "#3dd9b3", "#ffb648", "#ff6b8a"];

function TrafficSourcesChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip contentStyle={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.12)" }} />
        <Pie data={safeData} dataKey="incomingAmount" nameKey="source" outerRadius={110} innerRadius={64} paddingAngle={4}>
          {safeData.map((entry, index) => (
            <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export default TrafficSourcesChart;
