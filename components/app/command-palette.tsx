"use client";

import { useEffect, useMemo, useState } from "react";
import type { useRouter } from "next/navigation";
import { useOrg } from "@/hooks/use-org";
import { useClients } from "@/hooks/clients/use-clients";
import { useInvoices } from "@/hooks/invoicing/use-invoices";
import { useItems } from "@/hooks/items/use-items";
import { useAccounts } from "@/hooks/finance/use-finance";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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
  ShoppingBag,
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
  { label: "Activity", to: "/activity", icon: Receipt },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
}

export function CommandPalette({ open, onOpenChange, router }: CommandPaletteProps) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";
  const { data: clients } = useClients(orgId);
  const { data: invoices } = useInvoices(orgId);
  const { data: items } = useItems(orgId);
  const { data: accounts } = useAccounts(orgId);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const results = useMemo(() => ({
    clients: (clients ?? []).filter((client) => !query || `${client.name} ${client.company_name ?? ""}`.toLowerCase().includes(query)).slice(0, 8),
    invoices: (invoices ?? []).filter((invoice) => !query || `${invoice.invoice_number} ${invoice.client?.name ?? ""}`.toLowerCase().includes(query)).slice(0, 8),
    accounts: (accounts ?? []).filter((account) => !query || `${account.name} ${account.code ?? ""}`.toLowerCase().includes(query)).slice(0, 8),
    items: (items ?? []).filter((item) => !query || `${item.name} ${item.sku ?? ""}`.toLowerCase().includes(query)).slice(0, 8),
  }), [accounts, clients, invoices, items, query]);

  const select = (to: string) => {
    onOpenChange(false);
    setSearch("");
    router.push(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, clients, invoices…" value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {links.map((link) => (
            <CommandItem
              key={link.to}
              value={link.label}
              onSelect={() => select(link.to)}
            >
              <link.icon className="size-4" />
              {link.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {results.clients.length > 0 && <CommandGroup heading="Clients">
          {results.clients.map((client) => <CommandItem key={client.id} value={`${client.name} ${client.company_name ?? ""}`} onSelect={() => select(`/clients/${client.id}`)}><Building2 className="size-4" />{client.name}</CommandItem>)}
        </CommandGroup>}
        {results.invoices.length > 0 && <CommandGroup heading="Invoices">
          {results.invoices.map((invoice) => <CommandItem key={invoice.id} value={`${invoice.invoice_number} ${invoice.client?.name ?? ""}`} onSelect={() => select(`/invoices/${invoice.id}`)}><FileText className="size-4" />{invoice.invoice_number} <span className="text-muted-foreground">{invoice.client?.name}</span></CommandItem>)}
        </CommandGroup>}
        {results.accounts.length > 0 && <CommandGroup heading="Accounts">
          {results.accounts.map((account) => <CommandItem key={account.id} value={`${account.name} ${account.code ?? ""}`} onSelect={() => select("/finance/accounts")}><Wallet className="size-4" />{account.name} <span className="text-muted-foreground">{account.code}</span></CommandItem>)}
        </CommandGroup>}
        {results.items.length > 0 && <CommandGroup heading="Items">
          {results.items.map((item) => <CommandItem key={item.id} value={`${item.name} ${item.sku ?? ""}`} onSelect={() => select(`/inventory/${item.id}`)}><ShoppingBag className="size-4" />{item.name}</CommandItem>)}
        </CommandGroup>}
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
