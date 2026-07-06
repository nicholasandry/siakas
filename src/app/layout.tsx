import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIAKAS",
  description: "Sistem Informasi Aset Keuskupan Surabaya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} data-scroll-behavior="smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
