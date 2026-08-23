import type { Metadata } from "next";
import { ItemDetail } from "@/components/inventory/ItemDetail";

export const metadata: Metadata = {
  title: "Inventory Item",
  description: "View stock details and movement history for an item.",
};

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InventoryItemPage({ params }: ItemDetailPageProps) {
  const { id } = await params;
  return <ItemDetail itemId={id} />;
}
