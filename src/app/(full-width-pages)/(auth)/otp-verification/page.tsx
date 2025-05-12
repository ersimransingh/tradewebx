import OTPVerificationForm from "@/components/auth/OTPVerificationForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "OTP Verification | Tradeweb",
  description: "Verify your login with OTP",
};

export default function OTPVerification() {
  return <OTPVerificationForm />;
}