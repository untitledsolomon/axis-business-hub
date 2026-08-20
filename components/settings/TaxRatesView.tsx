"use client";

import { useState } from "react";
import { useOrg } from "@/hooks/use-org";
import { useTaxRates } from "@/hooks/finance/use-finance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Percent, MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { TaxRateForm } from "@/components/settings/TaxRateForm";
import { PageHeader } from "@/components/shared/PageHeader";

export function TaxRatesView() {
  const { currentOrg } = useOrg();
  const { data: taxRates, isLoading } = useTaxRates(currentOrg?.id ?? "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Tax Rates"
        description="Manage tax rates applied to your invoices and expenses."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Add Tax Rate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Add Tax Rate</DialogTitle>
              </DialogHeader>
              <TaxRateForm orgId={currentOrg?.id ?? ""} onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="">
        <div className="panel max-w-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Loading tax rates...
                  </TableCell>
                </TableRow>
              ) : !taxRates || taxRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No tax rates yet. Add your first one above.
                  </TableCell>
                </TableRow>
              ) : (
                taxRates.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-muted-foreground">
                        <Percent className="mr-1 h-3 w-3" />
                        <span className="numeric text-foreground">{tax.rate.toFixed(2)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tax.is_active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open menu for ${tax.name}`}>
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open menu for {tax.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled>
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
