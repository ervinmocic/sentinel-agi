import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "prismjs/themes/prism-tomorrow.css";
import { Sidebar } from "@/components/Sidebar";
import { GlobalAuth } from "@/components/GlobalAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sentinel - AGI Dashboard",
  description: "Company Building Automation System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-full text-white overflow-hidden`}
      >
        <GlobalAuth>
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-white/10">
            {children}
          </main>
        </GlobalAuth>
      </body>
    </html>
  );
}
