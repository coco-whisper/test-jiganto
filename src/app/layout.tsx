import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import NextTopLoader from "nextjs-toploader";

import { Providers } from "@/components/providers";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Jiganto Task Tracker",
  description: "Basic task tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <NextTopLoader
          color="hsl(158, 64%, 35%)"
          height={3}
          showSpinner={false}
          shadow="0 0 8px hsl(158, 64%, 35%)"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
