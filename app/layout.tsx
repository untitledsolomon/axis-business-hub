import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { OrgProvider } from "@/hooks/use-org";
import { QueryProvider } from "@/providers/query-provider";
import { RadixPointerEventsFailsafe } from "@/components/shared/RadixPointerEventsFailsafe";

export const metadata: Metadata = {
  metadataBase: new URL("https://axis.example.com"),
  title: {
    default: "Axis | Regent Business Hub",
    template: "%s | Axis",
  },
  description: "Axis is Regent's operations system for the businesses it runs and the clients it serves directly — invoicing, clients, employees, and financial tracking, set up and run as a done-for-you engagement.",
  keywords: ["business operations", "invoicing", "client management", "employee management", "financial tracking", "East Africa"],
  authors: [{ name: "Regent" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://axis.example.com",
    siteName: "Axis",
    title: "Axis | Regent Business Hub",
    description: "Regent's operations system for invoicing, clients, and financial tracking.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Axis | Regent Business Hub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axis | Regent Business Hub",
    description: "Regent's operations system for invoicing, clients, and financial tracking.",
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
      <body className="font-sans antialiased">
        <QueryProvider>
          <AuthProvider>
            <OrgProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <Sonner />
                <RadixPointerEventsFailsafe />
              </TooltipProvider>
            </OrgProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
