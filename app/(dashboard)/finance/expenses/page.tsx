import { Metadata } from "next";
import { ExpensesList } from "@/components/finance/ExpensesList";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Log and review business expenses.",
};

export default function ExpensesPage() {
  return <ExpensesList />;
}
