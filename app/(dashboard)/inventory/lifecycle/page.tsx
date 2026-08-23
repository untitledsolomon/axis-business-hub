import type { Metadata } from "next";
import { LifecycleView } from "@/components/inventory/LifecycleView";

export const metadata: Metadata = {
  title: "Asset lifecycle",
  description: "Track equipment from acquisition to sale, lease, or service.",
};

export default function AssetLifecyclePage() {
  return <LifecycleView />;
}
