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
import { Plus, Search, Filter, MoreHorizontal, FileSpreadsheet, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "General Ledger | Axis",
  description: "View and manage all journal entries and the general ledger.",
};

const journalEntries = [
  {
    id: "1",
    date: "2025-05-20",
    reference: "JE-001",
    description: "Monthly Office Rent Accrual",
    status: "posted",
    total: 2500000
  },
  {
    id: "2",
    date: "2025-05-18",
    reference: "INV-2025-001",
    description: "Revenue Recognition - Acme Corp",
    status: "posted",
    total: 1250000
  },
  {
    id: "3",
    date: "2025-05-15",
    reference: "JE-002",
    description: "Depreciation Expense - Computer Equipment",
    status: "draft",
    total: 450000
  },
];

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">General Ledger</h1>
          <p className="text-muted-foreground">
            The source of truth for all financial transactions and journal entries.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" /> Audit Log
          </Button>
          <Button className="bg-axis-blue hover:bg-blue-800">
            <Plus className="mr-2 h-4 w-4" /> New Journal Entry
          </Button>
        </div>
      </div>

      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="ledger">Account Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
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
                  <TableHead className="font-semibold w-[120px]">Date</TableHead>
                  <TableHead className="font-semibold w-[120px]">Reference</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Total Amount</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-axis-light/30">
                    <TableCell className="text-sm">{entry.date}</TableCell>
                    <TableCell className="font-mono text-sm">{entry.reference}</TableCell>
                    <TableCell className="font-medium">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "posted" ? "default" : "secondary"} className={entry.status === "posted" ? "bg-axis-green/10 text-axis-green hover:bg-axis-green/20 border-axis-green/20" : ""}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(entry.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Open menu for ${entry.reference}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Entry</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {entry.status === "posted" ? (
                            <DropdownMenuItem className="text-axis-red">Void Entry</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-axis-green">Post Entry</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4 pt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white border rounded-md border-dashed">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold">Detailed Ledger View</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Select an account to view its full transaction history and running balance.
            </p>
            <Button variant="outline" className="mt-4 border-axis-blue text-axis-blue">
              Select Account
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
