"use client";

import { useState } from "react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

import { ACTION_NAME, BASE_URL, PATH_URL } from "@/utils/constants";
import { RootState } from "@/redux/store";
import { setError as setAuthError } from "@/redux/features/authSlice";
import { getLocalStorage } from "@/utils/helper";
import { useTheme } from "@/context/ThemeContext";
import Button from "@/components/ui/button/Button";
import apiService from "./apiService";
import { toast } from "react-toastify";

export default function OtpModalUI({
  onClose,
  setShowOtp,
  setFundRequestOtp,
  localData
}) {
  const dispatch = useDispatch();
  const { colors } = useTheme();

  const { companyInfo } = useSelector(
    (state: RootState) => state.common
  );

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================
     OTP VALIDATION FUNCTION
     ======================= */
  const validateOtp = () => {
    if (!otp.trim()) {
      return "OTP is required";
    }

    if (!/^\d+$/.test(otp)) {
      return "OTP must contain only numbers";
    }

    

    return "";
  };


  const handleVerifyOtp = async() => {
    const validationError = validateOtp();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);


    const userId = getLocalStorage("userId");
    const userType = getLocalStorage("userType");

    const xmlData = `<dsXml>
      <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"VerifyOTP","Level":1,"RequestFrom":"W"</J_Ui>
      <Sql/>
      <X_Data>
        <ClientCode>${localData[0].ClientCode}</ClientCode>
        <Type>FR</Type>
        <OTP>${otp}</OTP>
      </X_Data>
      <X_GFilter/>
      <J_Api>"UserId":"${userId}","UserType":"${userType}"</J_Api>
    </dsXml>`;

    try {
      // API call here
      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
      if(response?.data?.success === true){   
        toast.success(`${response.data.message}`)
        setError("")
        setFundRequestOtp(false);
        setShowOtp(false);
      }if(response?.data?.success === false){ 
        setShowOtp(true);
        setError(`${response.data.message}`)
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "An error occurred during OTP verification";
      setError(msg);
      dispatch(setAuthError(msg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div
        style={{ background: colors.background }}
        className="w-full max-w-md rounded-xl shadow-xl p-6"
      >
        {companyInfo?.CompanyLogo && (
          <div className="flex justify-center mb-4">
            <Image
              src={
                companyInfo.CompanyLogo.startsWith("data:")
                  ? companyInfo.CompanyLogo
                  : `data:image/png;base64,${companyInfo.CompanyLogo}`
              }
              alt="Company Logo"
              width={70}
              height={70}
            />
          </div>
        )}

        <h2 className="text-xl font-semibold text-center mb-1">
          OTP Verification
        </h2>

        <p className="text-sm text-gray-500 text-center mb-5">
          Please enter the OTP sent to you
        </p>

        {error && (
          <div className="mb-4 p-3 text-sm bg-red-50 text-red-600 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>OTP</Label>
            <Input
              value={otp}
              onChange={(e: any) => {
                setOtp(e.target.value);
                setError("");
              }}
              dynamicSelectedThemeApply
              placeholder="Enter  OTP"
            />
          </div>

          <Button
            className="w-full"
            disabled={isLoading || otp.length < 1}
            onClick={handleVerifyOtp}
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



