import { Metadata } from "next";
import { InvoiceDetail } from "@/components/invoicing/InvoiceDetail";

export const metadata: Metadata = {
  title: "Invoice Details",
  description: "Line items, status, and actions for this invoice.",
};

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  return <InvoiceDetail invoiceId={id} />;
}
