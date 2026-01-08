'use client'

import { ThemeProvider } from "@/context/ThemeContext";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/redux/hooks";
import { fetchInitializeLogin } from "@/redux/features/common/commonSlice";
import { RootState } from "@/redux/store";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const { companyInfo, error } = useSelector((state: RootState) => state.common);

  useEffect(() => {
    // Skip initialization API call for SSO page - it will handle its own authentication
    if (pathname?.startsWith('/sso')) {
      return;
    }

    // Dispatch the fetchInitializeLogin action to get company data
    dispatch(fetchInitializeLogin())
    .unwrap()
    .catch((err: any) => {
      console.error("Init Login Failed:", err);
      toast.error("Failed to load please retry after sometime or try refreshing the page.");
    });
  
  }, [dispatch, pathname]);

  // You can use this to log the company info when it's loaded
  useEffect(() => {
    if (companyInfo) {
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
