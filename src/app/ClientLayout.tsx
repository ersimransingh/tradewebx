"use client";
import { Outfit } from "next/font/google";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Provider } from 'react-redux';
import { store } from "@/redux/store";
import { APP_METADATA_KEY } from "@/utils/constants";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "flatpickr/dist/themes/light.css";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TableStyling from "@/components/ui/table/TableStyling";
import { setupApiRouter } from "@/utils/apiService";
import AuthGuard from "@/components/auth/AuthGuard";
import DevelopmentModeIndicator from "@/components/common/DevelopmentModeIndicator";
import { getLocalStorage } from "@/utils/helper";
import SkipLink from "@/components/a11y/SkipLink";
import EmotionCacheProvider from "@/components/common/EmotionCacheProvider";

const appMetadata = (() => {
  try {
    return JSON.parse(getLocalStorage(APP_METADATA_KEY) || '{}')
  } catch (err) {
    return store.getState().common
  }
})();

const outfit = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
});

export default function ClientLayout({
  children,
  nonce,
}: Readonly<{
  children: React.ReactNode;
  nonce: string;
}>) {
  const router = useRouter();

  useEffect(() => {
    setupApiRouter(router);
  }, [router]);

  useEffect(() => {
    const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || appMetadata.companyName || "Trade Plus";
    document.title = appTitle;

    // Set favicon from company logo if available
    if (appMetadata?.companyLogo) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/x-icon";
        document.head.appendChild(link);
      }

      const logoUrl = appMetadata.companyLogo.startsWith('data:')
        ? appMetadata.companyLogo
        : `data:image/png;base64,${appMetadata.companyLogo}`;

      link.href = logoUrl;
    }
  }, []);

  return (
    <body className={`${outfit.variable} dark: bg - gray - 900`}>
      <EmotionCacheProvider nonce={nonce}>
        <Provider store={store}>
          <ThemeProvider>
            <SidebarProvider>
              <SkipLink targetId="main-content" />
              <AuthGuard>
                <main id="main-content" role="main" tabIndex={-1} className="min-h-screen">
                  {children}
                </main>
              </AuthGuard>
              <DevelopmentModeIndicator />
              <TableStyling />
              <ToastContainer />
            </SidebarProvider>
          </ThemeProvider>
        </Provider>
      </EmotionCacheProvider>
    </body>
  );
}
