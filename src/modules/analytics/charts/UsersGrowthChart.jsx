import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function UsersGrowthChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="usersGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#5ea6ff" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#5ea6ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" stroke="#93a7c3" tickLine={false} axisLine={false} />
        <YAxis stroke="#93a7c3" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.12)" }} />
        <Area type="monotone" dataKey="incomingAmount" stroke="#5ea6ff" fill="url(#usersGrowthFill)" strokeWidth={3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default UsersGrowthChart;
