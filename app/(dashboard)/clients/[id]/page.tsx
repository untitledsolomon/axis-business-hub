import { Metadata } from "next";
import { ClientDetail } from "@/components/clients/ClientDetail";

export const metadata: Metadata = {
  title: "Client Details",
  description: "Contact info, terms, and invoice history for this client.",
};

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  return <ClientDetail clientId={id} />;
}
