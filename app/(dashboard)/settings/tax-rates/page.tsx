import { Metadata } from "next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "Tax Rates | Axis",
  description: "Configure tax rates for your organization.",
};

const taxRates = [
  { id: "1", name: "Standard VAT (18%)", rate: 18.0, is_active: true },
  { id: "2", name: "Zero Rated (0%)", rate: 0.0, is_active: true },
  { id: "3", name: "Exempt", rate: 0.0, is_active: true },
  { id: "4", name: "Withholding Tax (6%)", rate: 6.0, is_active: true },
];

export default function TaxRatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Tax Rates</h1>
          <p className="text-muted-foreground">
            Manage tax rates applied to your invoices and expenses.
          </p>
        </div>
        <Button className="bg-axis-blue hover:bg-blue-800">
          <Plus className="mr-2 h-4 w-4" /> Add Tax Rate
        </Button>
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
            {taxRates.map((tax) => (
              <TableRow key={tax.id} className="hover:bg-axis-light/30">
                <TableCell className="font-medium">{tax.name}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Percent className="mr-1 h-3 w-3 text-muted-foreground" />
                    {tax.rate.toFixed(2)}%
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={tax.is_active ? "default" : "secondary"} className={tax.is_active ? "bg-axis-green/10 text-axis-green hover:bg-axis-green/20 border-axis-green/20" : ""}>
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-axis-red">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
