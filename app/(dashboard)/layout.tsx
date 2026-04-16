"use client";

import { AppSidebar } from "@/components/layouts/AppSidebar";
import { Topbar } from "@/components/layouts/Topbar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-axis-light">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
