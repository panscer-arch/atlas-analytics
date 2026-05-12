import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" stroke="#93a7c3" tickLine={false} axisLine={false} />
        <YAxis stroke="#93a7c3" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.12)" }} />
        <Bar dataKey="cyclePayouts" fill="#3dd9b3" radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default RevenueChart;
