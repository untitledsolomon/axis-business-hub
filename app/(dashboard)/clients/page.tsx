import { Metadata } from "next";
import { ClientsList } from "@/components/clients/ClientsList";

export const metadata: Metadata = {
  title: "Clients",
  description: "Manage your client directory and their financial relationships.",
};

export default function ClientsPage() {
  return <ClientsList />;
}
