import { Metadata } from "next";
import { DeliveryFormsList } from "@/components/delivery-forms/DeliveryFormsList";

export const metadata: Metadata = {
  title: "Delivery Forms",
  description: "Record what's been picked up or delivered, across one or more job orders.",
};

export default function DeliveryFormsPage() {
  return <DeliveryFormsList />;
}
