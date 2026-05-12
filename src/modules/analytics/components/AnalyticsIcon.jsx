function iconPaths(name) {
  switch (name) {
    case "target":
      return <path d="M12 3 14.6 8.4 20 11l-5.4 2.6L12 19l-2.6-5.4L4 11l5.4-2.6Z" />;
    case "fact":
      return <path d="M5 12.5 9.5 17 19 7.5" />;
    case "risk":
      return (
        <>
          <path d="M12 4 20 19H4L12 4Z" />
          <path d="M12 9V13.5" />
          <path d="M12 16.5h.01" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="4" y="6" width="16" height="14" rx="3" />
          <path d="M8 4v4M16 4v4M4 10h16" />
        </>
      );
    case "wallet":
      return (
        <>
          <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 15.5Z" />
          <path d="M15 13h5" />
          <circle cx="15" cy="13" r="1" />
        </>
      );
    case "inflow":
      return <path d="M12 4v13M7 10l5 7 5-7" />;
    case "network":
      return (
        <>
          <circle cx="6" cy="12" r="2" />
          <circle cx="18" cy="7" r="2" />
          <circle cx="18" cy="17" r="2" />
          <path d="M8 11 16 8M8 13l8 3" />
        </>
      );
    case "fee":
      return (
        <>
          <path d="M7 17 17 7" />
          <circle cx="8" cy="8" r="2" />
          <circle cx="16" cy="16" r="2" />
        </>
      );
    case "claim":
      return (
        <>
          <path d="M12 4v12" />
          <path d="m7 11 5 5 5-5" />
          <path d="M5 20h14" />
        </>
      );
    case "accrued":
      return (
        <>
          <path d="M12 7v5l3 2" />
          <circle cx="12" cy="12" r="8" />
        </>
      );
    case "tomorrow":
      return <path d="M5 12h14M13 6l6 6-6 6" />;
    case "active-wallet":
      return (
        <>
          <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 15.5Z" />
          <path d="M9 12h3" />
        </>
      );
    case "connected":
      return (
        <>
          <path d="M8.5 9.5h-1A3.5 3.5 0 1 0 7.5 16h1" />
          <path d="M15.5 9.5h1A3.5 3.5 0 1 1 16.5 16h-1" />
          <path d="M9 12h6" />
        </>
      );
    case "unique":
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case "transactions":
      return (
        <>
          <path d="M7 8h10l-2.5-2.5M17 16H7l2.5 2.5" />
        </>
      );
    case "volume":
      return (
        <>
          <path d="M6 16V9M12 16V5M18 16v-3" />
        </>
      );
    case "failed":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </>
      );
    case "average":
      return (
        <>
          <path d="M6 16h12M8 8h8M10 12h4" />
        </>
      );
    case "top-network":
      return (
        <>
          <path d="M12 5 14.2 9.2 19 10l-3.5 3.3.8 4.7L12 15.8 7.7 18l.8-4.7L5 10l4.8-.8Z" />
        </>
      );
    case "users":
      return (
        <>
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="16.5" cy="10.5" r="2" />
          <path d="M4.5 18c1.1-2.8 3.2-4.2 6-4.2S15.4 15.2 16.5 18" />
          <path d="M14.7 17.4c.7-1.8 2.1-2.8 4-2.8" />
        </>
      );
    case "alert":
      return (
        <>
          <path d="M12 4 20 19H4L12 4Z" />
          <path d="M12 9V13.5" />
          <path d="M12 16.5h.01" />
        </>
      );
    case "action":
      return <path d="M5 12h14M13 6l6 6-6 6" />;
    default:
      return <circle cx="12" cy="12" r="7" />;
  }
}

function AnalyticsIcon({ name, className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconPaths(name)}
    </svg>
  );
}

export default AnalyticsIcon;
