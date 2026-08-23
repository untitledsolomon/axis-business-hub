import { Metadata } from "next";
import { DailySaleDetail } from "@/components/finance/DailySaleDetail";

export const metadata: Metadata = {
  title: "Sale Details",
  description: "Details and ledger trace for this sale.",
};

interface DailySaleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DailySaleDetailPage({ params }: DailySaleDetailPageProps) {
  const { id } = await params;
  return <DailySaleDetail saleId={id} />;
}
