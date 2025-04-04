'use client'
import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Image from "next/image";

import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/redux/hooks";
import { fetchInitializeLogin } from "@/redux/features/common/commonSlice";
import { RootState } from "@/redux/store";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const { companyInfo, status, error } = useSelector((state: RootState) => state.common);

  useEffect(() => {
    // Dispatch the fetchInitializeLogin action to get company data
    dispatch(fetchInitializeLogin());
  }, [dispatch]);

  // You can use this to log the company info when it's loaded
  useEffect(() => {
    if (companyInfo) {
      console.log('Company Info from Redux:', companyInfo);
    }
    if (error) {
      console.error('Error loading company info:', error);
    }
  }, [companyInfo, error]);

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <Link href="/" className="block mb-4">
                  {companyInfo?.CompanyLogo && (
                    <div className="flex justify-center mb-3">
                      <Image
                        src={companyInfo.CompanyLogo.startsWith('data:')
                          ? companyInfo.CompanyLogo
                          : `data:image/png;base64,${companyInfo.CompanyLogo}`}
                        alt="Company Logo"
                        width={64}
                        height={64}
                        className="h-16 w-auto object-contain"
                        priority
                      />
                    </div>
                  )}
                  <h1 className="text-3xl font-bold text-white">
                    {companyInfo?.CompanyName?.trim() || ""}
                  </h1>
                </Link>
                <p className="text-center text-gray-400 dark:text-white/60">

                </p>
              </div>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
