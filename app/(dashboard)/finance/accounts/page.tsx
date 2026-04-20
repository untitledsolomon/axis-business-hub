import { Metadata } from "next";
import { AccountsList } from "@/components/finance/AccountsList";

export const metadata: Metadata = {
  title: "Chart of Accounts",
  description: "View and manage your organization's financial accounts.",
};

export default function AccountsPage() {
  return <AccountsList />;
}
