import { create } from "zustand";

const useAnalyticsFiltersStore = create((set) => ({
  dateRange: "30d",
  segment: "Все сегменты",
  source: "Все продукты",
  setDateRange: (dateRange) => set({ dateRange }),
  setSegment: (segment) => set({ segment }),
  setSource: (source) => set({ source }),
  resetFilters: () =>
    set({
      dateRange: "30d",
      segment: "Все сегменты",
      source: "Все продукты",
    }),
}));

export default function useAnalyticsFilters() {
  return useAnalyticsFiltersStore();
}
