import { Metadata } from "next";
import { JournalEntryDetail } from "@/components/finance/JournalEntryDetail";

export const metadata: Metadata = {
  title: "Transaction Details",
  description: "Journal lines, status, and actions for this transaction.",
};

interface TransactionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { id } = await params;
  return <JournalEntryDetail entryId={id} />;
}
