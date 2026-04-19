import { Metadata } from "next";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Set up your first organisation to get started with AXIS.",
};

export default function OnboardingPage() {
  return <OnboardingForm />;
}
