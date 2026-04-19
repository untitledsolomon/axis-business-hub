import { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your AXIS account and start managing your business more efficiently.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
