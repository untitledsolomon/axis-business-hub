import { Metadata } from "next";
import { InvoicesList } from "@/components/invoicing/InvoicesList";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Manage your customer billing and track payments.",
};

export default function InvoicesPage() {
  return <InvoicesList />;
}
