"use client";

import { useEffect, useState } from "react";
import type { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Percent,
  Plug,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

const links = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Clients", to: "/clients", icon: Building2 },
  { label: "Invoices", to: "/invoices", icon: FileText },
  { label: "Transactions", to: "/transactions", icon: Receipt },
  { label: "Inventory", to: "/inventory", icon: ShoppingBag },
  { label: "Chart of Accounts", to: "/finance/accounts", icon: Wallet },
  { label: "General Ledger", to: "/finance/ledger", icon: BookOpen },
  { label: "Banking", to: "/finance/banking", icon: CreditCard },
  { label: "Employees", to: "/employees", icon: Users },
  { label: "Tax Rates", to: "/settings/tax-rates", icon: Percent },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Connections", to: "/settings/connections", icon: Plug },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
}

export function CommandPalette({ open, onOpenChange, router }: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, clients, invoices…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {links.map((link) => (
            <CommandItem
              key={link.to}
              value={link.label}
              onSelect={() => {
                onOpenChange(false);
                router.push(link.to);
              }}
            >
              <link.icon className="size-4" />
              {link.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem
            value="New invoice"
            onSelect={() => {
              onOpenChange(false);
              router.push("/invoices");
            }}
          >
            <FileText className="size-4" />
            New invoice
            <CommandShortcut>⌘I</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="New client"
            onSelect={() => {
              onOpenChange(false);
              router.push("/clients");
            }}
          >
            <Building2 className="size-4" />
            New client
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
