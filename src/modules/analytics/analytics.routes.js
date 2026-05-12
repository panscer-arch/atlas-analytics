import AnalyticsPage from "./AnalyticsPage";
import AnalyticsRestoredPage from "./AnalyticsRestoredPage";

const analyticsRoutes = [
  {
    path: "/analytics",
    label: "Аналитика (восстановленная)",
    Component: AnalyticsRestoredPage,
  },
  {
    path: "/analytics-modern",
    label: "Аналитика",
    Component: AnalyticsPage,
  },
];

export default analyticsRoutes;
