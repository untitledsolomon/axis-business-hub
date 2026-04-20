import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { OrgProvider } from "@/hooks/use-org";
import { QueryProvider } from "@/providers/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://axis.example.com"),
  title: {
    default: "AXIS - Business Operating System",
    template: "%s | AXIS",
  },
  description: "AXIS is a modern business management platform designed as a lightweight alternative to QuickBooks, focusing on invoicing, clients, employees, and financial tracking.",
  keywords: ["business management", "invoicing", "client tracking", "employee management", "financial tracking", "SaaS"],
  authors: [{ name: "AXIS Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://axis.example.com",
    siteName: "AXIS",
    title: "AXIS - Business Operating System",
    description: "Modern business management platform for invoicing, clients, and financial tracking.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AXIS - Business Operating System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AXIS - Business Operating System",
    description: "Modern business management platform for invoicing, clients, and financial tracking.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <OrgProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </OrgProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
