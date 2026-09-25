import { Metadata } from "next";
import { JobOrdersList } from "@/components/job-orders/JobOrdersList";

export const metadata: Metadata = {
  title: "Job Orders",
  description: "Internal production and fulfillment tracking, from creation through delivery.",
};

export default function JobOrdersPage() {
  return <JobOrdersList />;
}
