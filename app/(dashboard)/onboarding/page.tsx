import type { Metadata } from "next";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Set up your organisation for Axis.",
};

export default function OnboardingPage() {
  return <OnboardingForm />;
}
