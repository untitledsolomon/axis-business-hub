import { Metadata } from "next";
import { QuotationDetail } from "@/components/quotations/QuotationDetail";

export const metadata: Metadata = {
  title: "Quotation Details",
  description: "Line items, status, and actions for this quotation.",
};

interface QuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const { id } = await params;
  return <QuotationDetail quotationId={id} />;
}
