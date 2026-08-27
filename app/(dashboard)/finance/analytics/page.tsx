import { Metadata } from "next";
import { AnalyticsView } from "@/components/finance/AnalyticsView";

export const metadata: Metadata = {
  title: "Analytics | Axis",
  description: "Revenue trends, receivables aging, and client analytics.",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
