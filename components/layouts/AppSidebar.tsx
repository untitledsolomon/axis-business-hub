"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Home,
  FileText,
  Landmark,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  BookOpen,
  ArrowLeftRight,
  UserSquare2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavLeaf {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
}

interface NavGroup {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: NavLeaf[];
}

type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

export function AppSidebar() {
  const [expanded, setExpanded] = useState(true);
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { title: "Dashboard", icon: Home, href: "/" },
    { title: "Clients", icon: UserSquare2, href: "/clients" },
    { title: "Invoices", icon: FileText, href: "/invoices" },
    { title: "Employees", icon: Users, href: "/employees" },
    { title: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
    {
      title: "Finance",
      icon: Landmark,
      children: [
        { title: "Chart of Accounts", icon: BookOpen, href: "/finance/accounts" },
        { title: "Banking", icon: Wallet, href: "/finance/banking" },
        { title: "General Ledger", icon: FileText, href: "/finance/ledger" },
      ],
    },
    { title: "Settings", icon: Settings, href: "/settings" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname?.startsWith(href + "/");

  const groupIsActive = (group: NavGroup) => group.children.some((c) => isActive(c.href));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (isGroup(item) && groupIsActive(item)) initial[item.title] = true;
    });
    return initial;
  });

  const toggleSidebar = () => setExpanded(!expanded);
  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  return (
    <Sidebar className={cn(
      "h-screen border-r transition-all duration-300",
      expanded ? "w-64" : "w-20"
    )}>
      <SidebarHeader className="p-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg bg-axis-blue text-white font-bold text-sm shrink-0",
            !expanded && "mx-auto"
          )}>
            A
          </div>
          {expanded && <span className="font-bold text-xl text-axis-blue">AXIS</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("text-muted-foreground", !expanded && "mx-auto")}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (isGroup(item)) {
                  const active = groupIsActive(item);
                  const open = expanded && (openGroups[item.title] ?? active);
                  return (
                    <div key={item.title}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          tooltip={!expanded ? item.title : undefined}
                          onClick={() => expanded && toggleGroup(item.title)}
                          className={cn(
                            "flex items-center gap-3 cursor-pointer",
                            active && "bg-axis-blue/10 text-axis-blue font-medium"
                          )}
                        >
                          <item.icon size={20} />
                          {expanded && (
                            <>
                              <span className="flex-1 text-left">{item.title}</span>
                              <ChevronDown
                                size={16}
                                className={cn("transition-transform", open && "rotate-180")}
                              />
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {open && (
                        <div className="ml-8 flex flex-col gap-0.5 my-1 border-l pl-3">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-axis-light/60 transition-colors",
                                isActive(child.href) && "text-axis-blue font-medium bg-axis-blue/10"
                              )}
                            >
                              <child.icon size={15} />
                              <span>{child.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={!expanded ? item.title : undefined}
                      className={cn(active && "bg-axis-blue/10 text-axis-blue font-medium")}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon size={20} />
                        {expanded && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
