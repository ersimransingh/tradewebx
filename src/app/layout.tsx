import { headers } from "next/headers";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { getDynamicFont } from "@/utils/font-loader";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";
  const dynamicFont = getDynamicFont();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta property="csp-nonce" content={nonce} />
        {dynamicFont.found && (
          <style nonce={nonce}>
            {`
              @font-face {
                font-family: '${dynamicFont.name}';
                src: url('${dynamicFont.url}') format('${dynamicFont.url.endsWith('.woff2') ? 'woff2' : 'woff'}');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
              }
              :root {
                --dynamic-font: ${dynamicFont.name}, Outfit, sans-serif;
              }
            `}
          </style>
        )}
        {!dynamicFont.found && (
          <style nonce={nonce}>
            {`
              :root {
                --dynamic-font: Outfit, sans-serif;
              }
            `}
          </style>
        )}
      </head>
      <ClientLayout nonce={nonce}>{children}</ClientLayout>
    </html>
  );
}
