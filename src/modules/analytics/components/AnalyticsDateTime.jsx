import { useEffect, useState } from "react";

function formatCurrentDateTime(date) {
  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
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
    <div className={`sus-clock${compact ? " sus-clock-compact" : ""}`} aria-label={`Московское время ${time}`}>
      <svg className="sus-clock-face" viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r="28" className="sus-clock-rim" />
        {Array.from({ length: 12 }, (_, index) => (
          <line key={index} x1="30" y1="6" x2="30" y2={index % 3 === 0 ? "11" : "8"} transform={`rotate(${index * 30} 30 30)`} className="sus-clock-tick" />
        ))}
        <line x1="30" y1="30" x2="30" y2="17" transform={`rotate(${Number(hours) % 12 * 30 + Number(minutes) / 2} 30 30)`} className="sus-clock-hour" />
        <line x1="30" y1="30" x2="30" y2="11" transform={`rotate(${Number(minutes) * 6 + Number(seconds) / 10} 30 30)`} className="sus-clock-minute" />
        <circle cx="30" cy="30" r="2.4" className="sus-clock-pin" />
      </svg>
      <div className="sus-clock-copy">
        <div><time dateTime={now.toISOString()}>{hours}:{minutes}</time><span>Москва · UTC+3</span></div>
        <span className="sus-clock-date">{date}</span>
      </div>
    </div>
  );
}

export default AnalyticsDateTime;
