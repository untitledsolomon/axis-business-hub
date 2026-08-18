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
import { Badge } from "@/components/ui/badge";
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

export function TaxRatesView() {
  const { currentOrg } = useOrg();
  const { data: taxRates, isLoading } = useTaxRates(currentOrg?.id ?? "");
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-axis-blue">Tax Rates</h1>
          <p className="text-muted-foreground text-sm">
            Manage tax rates applied to your invoices and expenses.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-axis-blue hover:bg-axis-blue-light">
              <Plus className="mr-2 h-4 w-4" /> Add Tax Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Add Tax Rate</DialogTitle>
            </DialogHeader>
            <TaxRateForm orgId={currentOrg?.id ?? ""} onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden max-w-2xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Rate</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading tax rates...
                </TableCell>
              </TableRow>
            ) : !taxRates || taxRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No tax rates yet. Add your first one above.
                </TableCell>
              </TableRow>
            ) : (
              taxRates.map((tax) => (
                <TableRow key={tax.id} className="hover:bg-axis-light/30">
                  <TableCell className="font-medium">{tax.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Percent className="mr-1 h-3 w-3 text-muted-foreground" />
                      {tax.rate.toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={tax.is_active ? "default" : "secondary"}
                      className={
                        tax.is_active
                          ? "bg-axis-green/10 text-axis-green hover:bg-axis-green/20 border-axis-green/20"
                          : ""
                      }
                    >
                      {tax.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Open menu for ${tax.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu for {tax.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-axis-red" disabled>
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
  );
}
