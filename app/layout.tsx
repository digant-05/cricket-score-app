import type { Metadata } from "next";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/outfit/800.css";
import "./globals.css";
import { PwaRegister } from "../components/PwaRegister";
export const metadata: Metadata = {
  title: "ScoreMitra — Cricket Scorer",
  description: "A beautiful, simple ball-by-ball cricket scoring app.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ScoreMitra" },
};
export const viewport = { width: "device-width", initialScale: "1.0" as unknown as number, maximumScale: "1.0" as unknown as number, userScalable: "0" as unknown as boolean, themeColor: "#174d37" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><PwaRegister />{children}</body></html>; }
