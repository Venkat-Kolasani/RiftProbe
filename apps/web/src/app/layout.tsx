import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiftProbe",
  description: "Adaptive AI Agent Failure Discovery & Regression Testing Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
