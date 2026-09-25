import { Metadata } from "next";
import { JobOrderDetail } from "@/components/job-orders/JobOrderDetail";

export const metadata: Metadata = {
  title: "Job Order Details",
  description: "Status, costs, and margin for this job order.",
};

interface JobOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobOrderDetailPage({ params }: JobOrderDetailPageProps) {
  const { id } = await params;
  return <JobOrderDetail jobOrderId={id} />;
}
