"use client";

import { useState } from "react";
import { Plus, Search, FileText, MoreHorizontal, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/lib/types";

const mockInvoices: (Invoice & { clientName: string })[] = [
  {
    id: "INV-001",
    clientId: "1",
    clientName: "Acme Corp",
    number: "INV-001",
    issueDate: "2024-03-20",
    dueDate: "2024-04-20",
    items: [],
    subtotal: 5000,
    tax: 500,
    total: 5500,
    status: "paid",
    createdAt: "2024-03-20",
    updatedAt: "2024-03-20",
  },
  {
    id: "INV-002",
    clientId: "2",
    clientName: "Global Tech",
    number: "INV-002",
    issueDate: "2024-04-01",
    dueDate: "2024-05-01",
    items: [],
    subtotal: 2500,
    tax: 250,
    total: 2750,
    status: "sent",
    createdAt: "2024-04-01",
    updatedAt: "2024-04-01",
  },
  {
    id: "INV-003",
    clientId: "1",
    clientName: "Acme Corp",
    number: "INV-003",
    issueDate: "2024-04-10",
    dueDate: "2024-05-10",
    items: [],
    subtotal: 1000,
    tax: 100,
    total: 1100,
    status: "overdue",
    createdAt: "2024-04-10",
    updatedAt: "2024-04-10",
  },
];

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvoices = mockInvoices.filter(
    (inv) =>
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-axis-green";
      case "sent": return "bg-axis-blue";
      case "overdue": return "bg-axis-red";
      case "draft": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Invoices</h1>
          <p className="text-muted-foreground">
            Generate and track your revenue.
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
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.number}</TableCell>
                <TableCell>{invoice.clientName}</TableCell>
                <TableCell>${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon"><Eye size={16} /></Button>
                    <Button variant="ghost" size="icon"><Download size={16} /></Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Invoice</DropdownMenuItem>
                        <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
