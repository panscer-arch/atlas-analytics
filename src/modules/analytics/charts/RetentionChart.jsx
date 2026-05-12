import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function RetentionChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="period" stroke="#93a7c3" tickLine={false} axisLine={false} />
        <YAxis stroke="#93a7c3" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.12)" }} />
        <Line type="monotone" dataKey="rate" stroke="#ffb648" strokeWidth={3} dot={{ r: 4, fill: "#ffb648" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default RetentionChart;
