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

        </div>
      </ThemeProvider>
    </div>
  );
}
