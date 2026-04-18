"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./CommandPalette";
import { DashboardBreadcrumbs } from "./DashboardBreadcrumbs";
import { OrganisationSwitcher } from "./OrganisationSwitcher";

export function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-6 flex-1">
        <OrganisationSwitcher />
        <CommandPalette />
        <DashboardBreadcrumbs />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-axis-red rounded-full"></span>
        </Button>
      </div>
    </header>
  );
}
