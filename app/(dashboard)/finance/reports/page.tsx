import { Metadata } from "next";
import { ReportsView } from "@/components/finance/ReportsView";

export const metadata: Metadata = {
  title: "Reports | Axis",
  description: "Trial balance, profit & loss, and balance sheet reports.",
};

export default function ReportsPage() {
  return <ReportsView />;
}
