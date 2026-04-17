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
import { Plus, Search, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "Transactions",
  description: "View and manage all financial transactions and journal entries.",
};

const transactions = [
  {
    id: "1",
    date: "May 15, 2025",
    description: "Invoice Payment - INV-2025-001",
    category: "Sales",
    type: "income",
    amount: 12500.00,
    status: "completed",
  },
  {
    id: "2",
    date: "May 14, 2025",
    description: "Monthly Rent - Office HQ",
    category: "Operations",
    type: "expense",
    amount: 2500.00,
    status: "completed",
  },
  {
    id: "3",
    date: "May 12, 2025",
    description: "AWS Cloud Services",
    category: "Operations",
    type: "expense",
    amount: 450.75,
    status: "pending",
  },
  {
    id: "4",
    date: "May 10, 2025",
    description: "Salary Payment - John Doe",
    category: "Payroll",
    type: "expense",
    amount: 5000.00,
    status: "completed",
  },
  {
    id: "5",
    date: "May 08, 2025",
    description: "Client Project Deposit - Global Tech",
    category: "Sales",
    type: "income",
    amount: 3200.50,
    status: "completed",
  },
];

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Transactions</h1>
          <p className="text-muted-foreground">
            A real-time ledger of all organization financial activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-axis-blue text-axis-blue hover:bg-axis-blue/5">
            <Plus className="mr-2 h-4 w-4" /> Record Expense
          </Button>
          <Button className="bg-axis-blue hover:bg-blue-800">
            <Plus className="mr-2 h-4 w-4" /> Add Income
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold w-[150px]">Date</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} className="hover:bg-axis-light/30">
                <TableCell className="text-sm">{transaction.date}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4 text-axis-green shrink-0" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-axis-red shrink-0" />
                    )}
                    <span className="font-medium truncate">{transaction.description}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-axis-light text-axis-gray border-none">
                    {transaction.category}
                  </Badge>
                </TableCell>
                <TableCell className={transaction.type === "income" ? "text-axis-green font-semibold" : "text-axis-red font-semibold"}>
                  {transaction.type === "income" ? "+" : "-"}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      transaction.status === "completed" ? "bg-axis-green/5 text-axis-green border-axis-green/20" : "bg-axis-gray/5 text-axis-gray border-axis-gray/20"
                    }
                  >
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
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
                      <DropdownMenuItem>View Journal Entry</DropdownMenuItem>
                      <DropdownMenuItem>View Attachment</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-axis-red">Void Transaction</DropdownMenuItem>
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
