import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

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
    <html lang="id" data-scroll-behavior="smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
