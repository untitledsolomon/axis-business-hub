import { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your business performance, recent activities, and key metrics.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
