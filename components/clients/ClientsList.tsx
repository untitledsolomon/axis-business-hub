"use client";

import { useClients } from "@/hooks/clients/use-clients";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, MoreHorizontal, Mail, Phone, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/ClientForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useState, useEffect } from "react";
import { Client } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export function ClientsList() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const { data: clients, isLoading, isError, refetch } = useClients(currentOrg?.id || "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage your client directory and their financial relationships."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Add Client">
                <Plus className="size-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <ClientForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  You need an active organisation before adding a client.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-4 ">
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-5 py-4">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search clients" className="pl-9" />
            </div>
            <Button variant="outline" size="icon" aria-label="Filters">
              <Filter className="size-4" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Client Name</th>
                  <th className="px-5 py-3 text-left font-medium">Company</th>
                  <th className="px-5 py-3 text-left font-medium">Contact</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="w-10 px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isError ? (
                  <tr>
                    <td colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="rounded-full bg-destructive-soft p-3">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this data</h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                          Something went wrong while fetching this from the server. Please try again.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-5 py-3">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </td>
                      <td className="px-5 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-5 py-3"><Skeleton className="ml-auto h-8 w-8" /></td>
                    </tr>
                  ))
                ) : clients && clients.length > 0 ? (
                  clients.map((client: Client) => (
                    <tr key={client.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium text-foreground">{client.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{client.company_name || "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          {client.email && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Mail className="mr-1 h-3 w-3" /> {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Phone className="mr-1 h-3 w-3" /> {client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Open menu">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View details</DropdownMenuItem>
                            <DropdownMenuItem>Edit client</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Create invoice</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete client</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-12 w-12 text-muted-foreground opacity-20" />
                        <h3 className="text-sm font-semibold text-foreground">No clients yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Get started by adding your first client.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setIsFormOpen(true)}
                        >
                          <Plus className="size-4" />
                          Add Client
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
