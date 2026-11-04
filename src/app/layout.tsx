import type { Metadata } from "next";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import EnsureUser from "@/components/EnsureUser";
import AppHeader from "@/components/AppHeader";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don’t.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <ClerkProvider>
          <Suspense fallback={<div className="page muted">Loading…</div>}>
            <ConvexClientProvider>
              <EnsureUser />
              <AppHeader />
              <main className="flex-1">{children}</main>
            </ConvexClientProvider>
          </Suspense>
        </ClerkProvider>
      </body>
    </html>
  );
}
