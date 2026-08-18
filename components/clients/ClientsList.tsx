"use client";

import { useClients } from "@/hooks/clients/use-clients";
import { useOrg } from "@/hooks/use-org";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, MoreHorizontal, Mail, Phone, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
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
import { TableErrorState } from "@/components/shared/TableErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useState, useEffect } from "react";
import { Client } from "@/lib/types";

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
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client directory and their financial relationships."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-axis-blue hover:bg-axis-blue-light" aria-label="Add Client">
                <Plus className="mr-2 h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              {currentOrg ? (
                <ClientForm orgId={currentOrg.id} onSuccess={() => setIsFormOpen(false)} />
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  You need an active organisation before adding a client.
                </p>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold">Client Name</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableErrorState colSpan={5} onRetry={() => refetch()} />
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : clients && clients.length > 0 ? (
              clients.map((client: Client) => (
                <TableRow key={client.id} className="hover:bg-axis-light/30">
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.company_name || '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
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
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={client.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Open menu">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Edit client</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Create invoice</DropdownMenuItem>
                        <DropdownMenuItem className="text-axis-red">Delete client</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Users className="h-12 w-12 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-semibold">No clients yet</h3>
                    <p className="text-muted-foreground">
                      Get started by adding your first client.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-axis-blue text-axis-blue"
                      onClick={() => setIsFormOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Client
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
