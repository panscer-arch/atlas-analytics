import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function TrafficLifecycleChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={safeData}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="date" stroke="#93a7c3" tickLine={false} axisLine={false} />
        <YAxis stroke="#93a7c3" tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#0f1724", border: "1px solid rgba(255,255,255,0.12)" }} />
        <Legend />
        <Line type="monotone" dataKey="registrations" name="Регистрации" stroke="#5ea6ff" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="walletConnects" name="Кошельки" stroke="#3dd9b3" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="cycleActivations" name="Циклы" stroke="#ffb648" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TrafficLifecycleChart;
