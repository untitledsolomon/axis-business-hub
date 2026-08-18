"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, Percent, Plug, Users2 } from "lucide-react";

const tabs = [
  { title: "Organisation", href: "/settings", icon: Building2 },
  { title: "Tax Rates", href: "/settings/tax-rates", icon: Percent },
  { title: "Connections", href: "/settings/connections", icon: Plug },
  { title: "Team", href: "/settings/team", icon: Users2 },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organisation, tax configuration, and integrations.
        </p>
      </div>

      <div className="flex gap-6 border-b overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors",
                active && "border-axis-blue text-axis-blue"
              )}
            >
              <tab.icon size={16} />
              {tab.title}
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}
