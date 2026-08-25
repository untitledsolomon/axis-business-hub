export type DashboardTimeframe = "this_month" | "last_30_days" | "this_quarter" | "this_year" | "all_time";

export const TIMEFRAME_LABELS: Record<DashboardTimeframe, string> = {
  this_month: "This Month",
  last_30_days: "Last 30 Days",
  this_quarter: "This Quarter",
  this_year: "This Year",
  all_time: "All Time",
};

export function getTimeframeRange(timeframe: DashboardTimeframe, now = new Date()) {
  let start: Date;
  switch (timeframe) {
    case "this_month": start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case "last_30_days": start = new Date(now.getTime() - 30 * 86400000); break;
    case "this_quarter": start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
    case "this_year": start = new Date(now.getFullYear(), 0, 1); break;
    case "all_time": start = new Date(0); break;
  }
  return { start, end: now };
}

export function isDateInTimeframe(value: string, timeframe: DashboardTimeframe) {
  const date = new Date(value);
  const { start, end } = getTimeframeRange(timeframe);
  return date >= start && date <= end;
}