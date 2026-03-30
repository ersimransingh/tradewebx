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
  const fontConfig = await getDynamicFont();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta property="csp-nonce" content={nonce} />
        <style id="dynamic-font-ssg" nonce={nonce}>
          {`
            ${fontConfig.found ? `
            @font-face {
              font-family: '${fontConfig.name}';
              src: url('${fontConfig.url}') format('${fontConfig.url.endsWith('.woff2') ? 'woff2' : 'woff'}');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            ` : ''}
            :root {
              --dynamic-font: ${fontConfig.found ? `'${fontConfig.name}', ` : ''}Arial, sans-serif;
            }
          `}
        </style>
      </head>
      <ClientLayout nonce={nonce}>{children}</ClientLayout>
    </html>
  );
}
