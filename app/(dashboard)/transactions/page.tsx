import { Metadata } from "next";
import { TransactionsView } from "@/components/finance/TransactionsView";

export const metadata: Metadata = {
  title: "Transactions",
  description: "View and manage all financial transactions and journal entries.",
};

export default function TransactionsPage() {
  return <TransactionsView />;
}
