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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, FileDown, Send, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Manage your client billing and track payments.",
};

const invoices = [
  {
    id: "1",
    number: "INV-2025-001",
    client: "Acme Corp",
    amount: 12500.00,
    issueDate: new Date(2025, 4, 1),
    dueDate: new Date(2025, 4, 15),
    status: "paid",
  },
  {
    id: "2",
    number: "INV-2025-002",
    client: "Global Tech",
    amount: 3200.50,
    issueDate: new Date(2025, 4, 5),
    dueDate: new Date(2025, 4, 20),
    status: "sent",
  },
  {
    id: "3",
    number: "INV-2025-003",
    client: "Stark Industries",
    amount: 45000.00,
    issueDate: new Date(2025, 4, 10),
    dueDate: new Date(2025, 4, 25),
    status: "overdue",
  },
  {
    id: "4",
    number: "INV-2025-004",
    client: "Wayne Enterprises",
    amount: 890.00,
    issueDate: new Date(2025, 4, 12),
    dueDate: new Date(2025, 5, 12),
    status: "draft",
  },
];

export default function InvoicesPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-axis-green/10 text-axis-green border-axis-green/20";
      case "overdue":
        return "bg-axis-red/10 text-axis-red border-axis-red/20";
      case "sent":
        return "bg-axis-blue/10 text-axis-blue border-axis-blue/20";
      default:
        return "bg-axis-gray/10 text-axis-gray border-axis-gray/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Invoices</h1>
          <p className="text-muted-foreground">
            Create and track invoices for your clients.
          </p>
        </div>
        <Button className="bg-axis-blue hover:bg-blue-800">
          <Plus className="mr-2 h-4 w-4" /> Create Invoice
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold">Invoice #</TableHead>
              <TableHead className="font-semibold">Client</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Issue Date</TableHead>
              <TableHead className="font-semibold">Due Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id} className="hover:bg-axis-light/30">
                <TableCell className="font-medium">{invoice.number}</TableCell>
                <TableCell>{invoice.client}</TableCell>
                <TableCell className="font-semibold text-axis-blue">
                  ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-sm">
                  {format(invoice.issueDate, "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-sm">
                  {format(invoice.dueDate, "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(invoice.status)}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <FileDown className="mr-2 h-4 w-4" /> Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Send className="mr-2 h-4 w-4" /> Send to Client
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-axis-red">Void Invoice</DropdownMenuItem>
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
