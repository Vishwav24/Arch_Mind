import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "ArchMind AI - Autonomous Software Architect",
  description: "Enterprise software architecture synthesis, traceability, validation, and change impact agent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[var(--page-bg)] text-[var(--text-primary)] antialiased`}>
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 min-w-0 h-full overflow-y-auto bg-[var(--page-bg)] p-7 md:p-8">
            <div className="w-full mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
