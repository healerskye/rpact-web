import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "rpact — Clinical Trial Design & Analysis",
  description: "Confirmatory adaptive clinical trial design and analysis powered by rpact",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
