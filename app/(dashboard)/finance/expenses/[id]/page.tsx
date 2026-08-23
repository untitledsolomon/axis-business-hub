import { Metadata } from "next";
import { ExpenseDetail } from "@/components/finance/ExpenseDetail";

export const metadata: Metadata = {
  title: "Expense Details",
  description: "Details and ledger trace for this expense.",
};

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: ExpenseDetailPageProps) {
  const { id } = await params;
  return <ExpenseDetail expenseId={id} />;
}
