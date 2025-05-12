"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setError as setAuthError, setLoading } from '@/redux/features/authSlice';
import { BASE_URL, LOGIN_URL, BASE_PATH_FRONT_END, OTP_VERIFICATION_URL } from "@/utils/constants";
import Image from "next/image";
import { RootState } from "@/redux/store";
import { toast } from "react-toastify";

export default function ForgotPasswordForm() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { companyInfo } = useSelector((state: RootState) => state.common);

    // Step 1 states
    const [clientCode, setClientCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Step 2 states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentStep, setCurrentStep] = useState(1);

    const handleClientCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"tradeweb", "Option":"ForgotPassword","Level":1</J_Ui>
            <Sql></Sql>
            <X_Filter></X_Filter>
            <X_Data><ClientCode>${clientCode}</ClientCode></X_Data>
            <X_GFilter />
            <J_Api></J_Api>
        </dsXml>`;

        try {
            const response = await axios({
                method: 'post',
                url: BASE_URL + OTP_VERIFICATION_URL,
                headers: {
                    'Content-Type': 'application/xml',
                },
                data: xmlData
            });

            if (response.data.success) {
                setCurrentStep(2);
                toast.success(response.data.message);
            } else {
                setError(response.data.message || 'Failed to process request');
            }
        } catch (err) {
            const errorMessage = axios.isAxiosError(err)
                ? err.response?.data?.message || 'An error occurred'
                : 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        setError("");

        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"tradeweb", "Option":"ChangePassword","Level":1</J_Ui>
            <Sql></Sql>
            <X_Filter></X_Filter>
            <X_Data>
            <otp>${otp}</otp>
            <ClientCode>${clientCode}</ClientCode>
            <NewPassword>${newPassword}</NewPassword>
            </X_Data>
            <X_GFilter />
            <J_Api></J_Api>
        </dsXml>`;

        try {
            const response = await axios({
                method: 'post',
                url: BASE_URL + OTP_VERIFICATION_URL,
                headers: {
                    'Content-Type': 'application/xml',
                },
                data: xmlData
            });

            if (response.data.success) {
                router.push('/signin');
                toast.success(response.data.message);
            } else {
                setError(response.data.message || 'Failed to change password');
            }
        } catch (err) {
            const errorMessage = axios.isAxiosError(err)
                ? err.response?.data?.message || 'An error occurred'
                : 'An error occurred';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 lg:w-1/2 w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto ">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                    <div>
                        {companyInfo?.CompanyLogo && (
                            <div className="flex justify-center mb-5">
                                <Image
                                    src={companyInfo.CompanyLogo.startsWith('data:')
                                        ? companyInfo.CompanyLogo
                                        : `data:image/png;base64,${companyInfo.CompanyLogo}`}
                                    alt="Company Logo"
                                    width={64}
                                    height={64}
                                    className="h-20 w-auto object-contain drop-shadow-md"
                                    priority
                                />
                            </div>
                        )}
                        <h1 className="text-3xl font-bold text-black dark:text-white text-center mb-2">
                            {companyInfo?.CompanyName?.trim() || ""}
                        </h1>
                    </div>

                    <div className="my-5 border-b border-gray-200 dark:border-gray-700"></div>

                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Forgot Password
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {currentStep === 1
                                ? "Enter your client code to reset your password"
                                : "Enter the OTP and your new password"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {currentStep === 1 ? (
                        <form onSubmit={handleClientCodeSubmit} className="space-y-5">
                            <div>
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">Client Code</Label>
                                <Input
                                    type="text"
                                    value={clientCode}
                                    onChange={(e) => setClientCode(e.target.value)}
                                    placeholder="Enter your client code"
                                    className="mt-1 transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-all duration-200 mt-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </div>
                                ) : 'Continue'}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handlePasswordChange} className="space-y-5">
                            <div>
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">OTP</Label>
                                <Input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter OTP"
                                    className="mt-1 transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                                />
                            </div>

                            <div>
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">New Password</Label>
                                <div className="relative mt-1">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        className="transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                                    />
                                    <span
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <Label className="text-gray-700 dark:text-gray-300 font-medium">Confirm Password</Label>
                                <div className="relative mt-1">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                                    />
                                    <span
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showConfirmPassword ? <EyeIcon /> : <EyeCloseIcon />}
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-all duration-200 mt-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Changing Password...
                                    </div>
                                ) : 'Change Password'}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
            <div className="flex justify-end items-center p-4">
                <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
                    <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: '11px' }}>Powered By:</span>
                    <a href="https://www.secmark.in" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
                        <Image src={BASE_PATH_FRONT_END + "/images/secmarklogo.png"} alt="Tradesoft" width={90} height={90} />
                    </a>
                </div>
            </div>
        </div>
    );
}
