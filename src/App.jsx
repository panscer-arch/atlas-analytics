import { AnalyticsPage, AnalyticsRestoredPage } from "./modules/analytics";

function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";

  if (pathname === "/legacy" || pathname === "/analytics") {
    return <AnalyticsRestoredPage />;
  }

  return <AnalyticsPage />;
}

export default App;
