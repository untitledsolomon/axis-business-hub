import { Metadata } from "next";
import { DailySalesList } from "@/components/finance/DailySalesList";

export const metadata: Metadata = {
  title: "Quick Sales",
  description: "Log and review non-invoiced walk-in sales.",
};

export default function DailySalesPage() {
  return <DailySalesList />;
}
