"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setFinalAuthData, setError as setAuthError } from '@/redux/features/authSlice';
import { ACTION_NAME, BASE_PATH_FRONT_END, BASE_URL, OTP_VERIFICATION_URL } from "@/utils/constants";
import { useTheme } from "@/context/ThemeContext";

import Image from "next/image";
import { RootState } from "@/redux/store";

export default function OTPVerificationForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [otp, setOtp] = useState<any>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { companyInfo, status } = useSelector((state: RootState) => state.common);
  const { colors } = useTheme();

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const xmlData = `<dsXml>
      <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"Verify2FA","Level":1, "RequestFrom":"M"</J_Ui>
      <Sql/>
      <X_Data>
          <OTP>${otp}</OTP>
      </X_Data>
      <X_GFilter/>
      <J_Api>"UserId":"${localStorage.getItem('userId')}", "UserType":"${localStorage.getItem('userType')}"</J_Api>
    </dsXml>`;

    try {
      const response = await axios({
        method: 'post',
        url: BASE_URL + OTP_VERIFICATION_URL,
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': `Bearer ${localStorage.getItem('temp_token')}`
        },
        data: xmlData
      });

      const data = response.data;

      if (data.status && data.status_code === 200) {
        // Store in Redux and set cookie
        dispatch(setFinalAuthData({
          token: data.token,
          tokenExpireTime: data.tokenExpireTime,
          clientCode: data.data[0].ClientCode,
          clientName: data.data[0].ClientName,
          userType: data.data[0].UserType,
        }));

        // Set cookie
        document.cookie = `auth_token=${data.token}; path=/; expires=${new Date(data.tokenExpireTime).toUTCString()}`;

        // Update localStorage
        localStorage.setItem('clientCode', data.data[0].ClientCode);
        localStorage.setItem('clientName', data.data[0].ClientName);
        localStorage.setItem('userType', data.data[0].UserType);
        localStorage.setItem('tokenExpireTime', data.tokenExpireTime);

        // Clean up temporary token
        localStorage.removeItem('temp_token');

        router.push('/dashboard');
      } else {
        const errorMessage = data.message || 'OTP verification failed';
        dispatch(setAuthError(errorMessage));
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || 'An error occurred during OTP verification'
        : 'An error occurred during OTP verification';

      dispatch(setAuthError(errorMessage));
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: colors.background }} className="flex flex-col flex-1 lg:w-1/2 w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
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
            <h1 style={{ color: colors.tabText }} className="text-3xl font-bold text-black dark:text-white text-center mb-2">
              {companyInfo?.CompanyName?.trim() || ""}
            </h1>
          </div>
          <div className="my-5 border-b border-gray-200 dark:border-gray-700"></div>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              OTP Verification
            </h1>
            <p style={{ color: colors.text }} className="text-gray-500 dark:text-gray-400">
              Please enter the OTP sent.
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

          <form onSubmit={handleOTPVerification} className="space-y-5">
            <div>
              <Label className="text-gray-700 dark:text-gray-300 font-medium">Enter OTP</Label>
              <Input
                type="text"
                value={otp}
                onChange={(e: any) => setOtp(e.target.value)}
                dynamicSelectedThemeApply={true}
                placeholder="Enter OTP"
                required
                className="mt-1 transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                {...{} as any}

              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-all duration-200 mt-2"
              disabled={isLoading}
              dynamicSelectedThemeApply={true}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </div>
              ) : 'Verify OTP'}
            </Button>
          </form>
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