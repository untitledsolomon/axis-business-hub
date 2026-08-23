import { Metadata } from "next";
import { DailySummaryView } from "@/components/finance/DailySummaryView";

export const metadata: Metadata = {
  title: "Daily Summary",
  description: "End-of-day snapshot of sales, expenses, and net cash position.",
};

export default function DailySummaryPage() {
  return <DailySummaryView />;
}
