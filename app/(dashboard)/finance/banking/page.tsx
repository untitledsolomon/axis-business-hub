import { Metadata } from "next";
import { BankingView } from "@/components/finance/BankingView";

export const metadata: Metadata = {
  title: "Banking | Axis",
  description: "Manage your bank accounts and cash balances.",
};

export default function BankingPage() {
  return <BankingView />;
}
