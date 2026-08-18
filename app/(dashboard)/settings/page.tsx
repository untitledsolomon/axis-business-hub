import { Metadata } from "next";
import { OrganisationSettingsView } from "@/components/settings/OrganisationSettingsView";

export const metadata: Metadata = {
  title: "Organisation Settings | Axis",
  description: "Manage your organisation profile.",
};

export default function SettingsPage() {
  return <OrganisationSettingsView />;
}
