"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronsUpDown,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Percent,
  Plug,
  Receipt,
  Search,
  Settings,
  Users,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette, useCommandPalette } from "@/components/app/command-palette";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard };

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard },
      { label: "Clients", to: "/clients", icon: Building2 },
      { label: "Invoices", to: "/invoices", icon: FileText },
      { label: "Transactions", to: "/transactions", icon: Receipt },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Chart of Accounts", to: "/finance/accounts", icon: Wallet },
      { label: "General Ledger", to: "/finance/ledger", icon: BookOpen },
      { label: "Banking", to: "/finance/banking", icon: CreditCard },
      { label: "Tax Rates", to: "/settings/tax-rates", icon: Percent },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Employees", to: "/employees", icon: Users },
      { label: "Team", to: "/settings/team", icon: UserCog },
    ],
  },
  {
    title: "Others",
    items: [
      { label: "Settings", to: "/settings", icon: Settings },
      { label: "Connections", to: "/settings/connections", icon: Plug },
    ],
  },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || "U";
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentOrg, organisations, setOrg } = useOrg();
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = initialsOf(displayName);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="px-4 py-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
                A
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-semibold text-foreground">
                  {currentOrg ? currentOrg.name : "Select organisation"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">Axis Business Hub</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Organisations</DropdownMenuLabel>
            {organisations.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => setOrg(o.id)}>
                <Building2 className="size-4" />
                <span className="flex-1">{o.name}</span>
                {o.id === currentOrg?.id && <span className="text-xs text-primary">Current</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/onboarding">Create organisation</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-6 pb-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname?.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        href={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-raised"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-teal-soft text-xs text-teal-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
          </span>
          <LogOut className="size-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { open, setOpen } = useCommandPalette();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = initialsOf(displayName);

  return (
    <div className="min-h-screen bg-background p-0 lg:p-3">
      <div className="flex min-h-screen overflow-hidden rounded-none border-border bg-surface lg:min-h-[calc(100vh-1.5rem)] lg:rounded-2xl lg:border lg:shadow-card">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
          <SidebarContent />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar">
              <button
                className="absolute right-3 top-4 text-muted-foreground"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>

            <button
              onClick={() => setOpen(true)}
              className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:max-w-sm"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Search here…</span>
              <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[0.65rem] md:inline">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                    <Bell className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="text-xs text-muted-foreground">You&apos;re all caught up</p>
                  </div>
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="icon" aria-label="Help">
                <HelpCircle className="size-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary-soft text-xs text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="size-4" />
                      Organisation settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/team">
                      <UserCog className="size-4" />
                      Team members
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => signOut()}>
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} router={router} />
    </div>
  );
}
