"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building2, CreditCard, Percent, Plug, Users2 } from "lucide-react";

const tabs = [
  { title: "Organisation", href: "/settings", icon: Building2 },
  { title: "Billing", href: "/settings/billing", icon: CreditCard },
  { title: "Tax Rates", href: "/settings/tax-rates", icon: Percent },
  { title: "Connections", href: "/settings/connections", icon: Plug },
  { title: "Team", href: "/settings/team", icon: Users2 },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border mb-3">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                active && "border-primary text-primary"
              )}
            >
              <tab.icon size={16} />
              {tab.title}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
