import ForgotPasswordForm from "@/components/auth/ForgotPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Forgot Password | Tradeweb",
    description: "Forgot your password? Reset it here",
};

export default function ForgotPassword() {
    return <ForgotPasswordForm />;
}