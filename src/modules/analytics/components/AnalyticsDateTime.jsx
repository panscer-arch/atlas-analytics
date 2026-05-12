import { useEffect, useState } from "react";

function formatCurrentDateTime(date) {
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);

  return {
    date: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1),
    time: formattedTime,
  };
}

function AnalyticsDateTime({ compact = false }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const { date, time } = formatCurrentDateTime(now);

  return (
    <div className={`analytics-datetime${compact ? " analytics-datetime-compact" : ""}`}>
      <div className="analytics-datetime-label">Сегодня</div>
      <div className="analytics-datetime-date">{date}</div>
      <div className="analytics-datetime-time">{time}</div>
    </div>
  );
}

export default AnalyticsDateTime;
