import type { Metadata } from "next";
import { CustodyView } from "@/components/inventory/CustodyView";

export const metadata: Metadata = {
  title: "Asset custody",
  description: "Monitor items issued to staff and expected return dates.",
};

export default function CustodyPage() {
  return <CustodyView />;
}
