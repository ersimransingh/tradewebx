import { headers } from "next/headers";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta property="csp-nonce" content={nonce} />
      </head>
      <ClientLayout nonce={nonce}>{children}</ClientLayout>
    </html>
  );
}
