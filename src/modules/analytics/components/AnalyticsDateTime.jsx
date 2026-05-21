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

function splitTime(time) {
  const [hours = "00", minutes = "00", seconds = "00"] = time.split(":");

  return { hours, minutes, seconds };
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
  const { hours, minutes, seconds } = splitTime(time);

  return (
    <div className={`analytics-datetime${compact ? " analytics-datetime-compact" : ""}`}>
      <div className="analytics-datetime-scanline" aria-hidden="true" />
      <div className="analytics-datetime-topline">
        <span className="analytics-datetime-label">System time</span>
        <span className="analytics-datetime-zone">MSK</span>
      </div>
      <div className="analytics-datetime-clock" aria-label={`Текущее время ${time}`}>
        <span className="analytics-datetime-unit">{hours}</span>
        <span className="analytics-datetime-separator">:</span>
        <span className="analytics-datetime-unit">{minutes}</span>
        <span className="analytics-datetime-separator">:</span>
        <span className="analytics-datetime-unit analytics-datetime-unit-seconds">{seconds}</span>
      </div>
      <div className="analytics-datetime-date">{date}</div>
    </div>
  );
}

export default AnalyticsDateTime;
