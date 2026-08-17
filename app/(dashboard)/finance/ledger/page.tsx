import { Metadata } from "next";
import { LedgerView } from "@/components/finance/LedgerView";

export const metadata: Metadata = {
  title: "General Ledger | Axis",
  description: "View and manage all journal entries and the general ledger.",
};

export default function LedgerPage() {
  return <LedgerView />;
}
