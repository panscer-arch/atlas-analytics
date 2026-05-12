import { useQuery } from "@tanstack/react-query";
import { getAnalyticsDashboard } from "../services/analyticsApi";
import useAnalyticsFilters from "./useAnalyticsFilters";

export default function useAnalyticsData() {
  const filters = useAnalyticsFilters();

  return useQuery({
    queryKey: ["analytics-dashboard", filters.dateRange, filters.segment, filters.source],
    queryFn: () =>
      getAnalyticsDashboard({
        dateRange: filters.dateRange,
        segment: filters.segment,
        source: filters.source,
      }),
    retry: false,
  });
}
