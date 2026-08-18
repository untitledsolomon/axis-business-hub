import { Metadata } from "next";
import { TaxRatesView } from "@/components/settings/TaxRatesView";

export const metadata: Metadata = {
  title: "Tax Rates | Axis",
  description: "Configure tax rates for your organization.",
};

export default function TaxRatesPage() {
  return <TaxRatesView />;
}
