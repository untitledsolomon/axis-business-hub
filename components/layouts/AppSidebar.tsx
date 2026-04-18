"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BarChart,
  Home,
  FileText,
  DollarSign,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppSidebar() {
  const [expanded, setExpanded] = useState(true);
  const { user, signOut } = useAuth();

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const navItems = [
    { title: "Dashboard", icon: Home, href: "/" },
    { title: "Clients", icon: Users, href: "/clients" },
    { title: "Invoices", icon: FileText, href: "/invoices" },
    { title: "Employees", icon: Users, href: "/employees" },
    { title: "Transactions", icon: DollarSign, href: "/transactions" },
    { title: "Analytics", icon: BarChart, href: "/analytics" },
    { title: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <Sidebar className={cn(
      "h-screen border-r transition-all duration-300",
      expanded ? "w-64" : "w-20"
    )}>
      <SidebarHeader className="p-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("font-bold text-xl text-axis-blue", !expanded && "mx-auto")}>
            {expanded ? "AXIS" : "A"}
          </span>
        </div>
        {expanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-muted-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={20} />
          </Button>
        )}
        {!expanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mx-auto text-muted-foreground"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={20} />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={!expanded ? item.title : undefined}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon size={20} />
                      {expanded && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        {expanded ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-axis-blue text-white text-xs">
                  {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm truncate max-w-[120px]">
                <span className="font-medium truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className="text-muted-foreground text-xs capitalize">Member</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground" aria-label="Sign out">
              <LogOut size={18} />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground" aria-label="Sign out">
              <LogOut size={18} />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
