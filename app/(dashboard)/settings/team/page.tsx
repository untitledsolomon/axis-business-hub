import { Metadata } from "next";
import { TeamSettingsView } from "@/components/settings/TeamSettingsView";

export const metadata: Metadata = {
  title: "Team | Axis",
  description: "Manage who has access to your organisation.",
};

export default function TeamPage() {
  return <TeamSettingsView />;
}
