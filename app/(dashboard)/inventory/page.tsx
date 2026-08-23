import type { Metadata } from "next";
import { InventoryView } from "@/components/inventory/InventoryView";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Track stock levels, costs, and reorder points across your organisation.",
};

export default function InventoryPage() {
  return <InventoryView />;
}
