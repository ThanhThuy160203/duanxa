import type { RoleDashboardConfig } from "./roleDashboardConfig";
import type { DashboardStats } from "./useDashboardStats";

export type HighlightDefinition = RoleDashboardConfig["highlights"][number];

const formatNumber = (value?: number) =>
  typeof value === "number" ? value.toLocaleString("vi-VN") : undefined;

export const getHighlightValue = (highlight: HighlightDefinition, stats: DashboardStats) => {
  if (highlight.statKey) {
    return formatNumber(stats[highlight.statKey]) ?? "0";
  }

  return highlight.value ?? "0";
};

export const getHighlightDetail = (highlight: HighlightDefinition, stats: DashboardStats) => {
  if (highlight.detailStatKey) {
    const statValue = stats[highlight.detailStatKey];
    if (typeof statValue === "number") {
      if (highlight.detailFormatter) {
        return highlight.detailFormatter(statValue);
      }
      return formatNumber(statValue);
    }
    return undefined;
  }

  return highlight.detail;
};
