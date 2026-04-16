import type { Metadata } from "next";
import { Geist_Mono, Nunito, Plus_Jakarta_Sans } from "next/font/google";
import { AppFooter } from "@/components/app-footer";
import { AppMain } from "@/components/app-main";
import { CoreFeatureNav } from "@/components/core-feature-nav";
import MvpAppNav from "@/components/mvp-app-nav";
import SyncAppUser from "@/components/sync-app-user";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "NurtureAI — Child health guidance",
  description:
    "Safety-first symptom guidance for parents. Not a substitute for emergency services or your clinician.",
  icons: {
    icon: "/favicon.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SyncAppUser />
        <MvpAppNav />
        <CoreFeatureNav />
        <AppMain>{children}</AppMain>
        <AppFooter />
      </body>
    </html>
  );
}
