import { Metadata } from "next";
import { QuotationsList } from "@/components/quotations/QuotationsList";

export const metadata: Metadata = {
  title: "Quotations",
  description: "Send price quotes to clients and convert accepted ones into invoices.",
};

export default function QuotationsPage() {
  return <QuotationsList />;
}
