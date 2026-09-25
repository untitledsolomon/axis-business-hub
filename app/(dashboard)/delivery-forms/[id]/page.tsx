import { Metadata } from "next";
import { DeliveryFormDetail } from "@/components/delivery-forms/DeliveryFormDetail";

export const metadata: Metadata = {
  title: "Delivery Form Details",
  description: "Job orders and client details for this delivery form.",
};

interface DeliveryFormDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeliveryFormDetailPage({ params }: DeliveryFormDetailPageProps) {
  const { id } = await params;
  return <DeliveryFormDetail deliveryFormId={id} />;
}
