import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Boundary — Cricket Scorer", description: "A beautiful, simple ball-by-ball cricket scoring app." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
