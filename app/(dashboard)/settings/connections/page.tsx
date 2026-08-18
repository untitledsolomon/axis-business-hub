import { Metadata } from "next";
import { ConnectionsView } from "@/components/settings/ConnectionsView";

export const metadata: Metadata = {
  title: "Connections | Axis",
  description: "Manage integrations and connected apps.",
};

export default function ConnectionsPage() {
  return <ConnectionsView />;
}
