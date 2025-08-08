"use client";
import { Outfit } from "next/font/google";
import "./globals.css";

import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Provider } from 'react-redux';
import { store } from "@/redux/store";
import { APP_METADATA_KEY, BASE_PATH_FRONT_END } from "@/utils/constants";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "flatpickr/dist/themes/light.css";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TableStyling from "@/components/ui/table/TableStyling";
import { setupApiRouter } from "@/utils/apiService";
import AuthGuard from "@/components/auth/AuthGuard";
import DevelopmentModeIndicator from "@/components/common/DevelopmentModeIndicator";

const appMetadata = (() => {
  try {
    return JSON.parse(localStorage.getItem(APP_METADATA_KEY))
  } catch (err) {
    return store.getState().common
  }
})();

const outfit = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const router = useRouter();

  useEffect(() => {
    // Set up the router for API service
    setupApiRouter(router);
  }, [router]);

  return (
    <html lang="en">
      <head>
        <title>{appMetadata?.companyName || "Tradeweb"}</title>
        {
          appMetadata?.companyLogo && (
            <link rel="icon" type="image/x-icon" href={appMetadata.companyLogo} />
          )
        }
      </head>
      <body className={`${outfit.variable} dark:bg-gray-900`}>
        <Provider store={store}>
          <ThemeProvider>
            <SidebarProvider>
              <AuthGuard>
                {children}
              </AuthGuard>
              <DevelopmentModeIndicator />
              <TableStyling />
              <ToastContainer />
            </SidebarProvider>
          </ThemeProvider>
        </Provider>
      </body>
    </html>
  );
}
