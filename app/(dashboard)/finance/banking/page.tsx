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
import { Plus, Landmark, CreditCard, MoreHorizontal, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "Banking | Axis",
  description: "Manage your bank accounts and cash balances.",
};

const bankAccounts = [
  { id: "1", name: "Main Business Account", bank: "Stanbic Bank", number: "**** 1234", balance: 15240500, currency: "UGX", type: "Bank" },
  { id: "2", name: "USD Savings", bank: "ABSA", number: "**** 5678", balance: 520000, currency: "USD", type: "Bank" },
  { id: "3", name: "Office Petty Cash", bank: "N/A", number: "N/A", balance: 450000, currency: "UGX", type: "Cash" },
];

export default function BankingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Banking</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts, cash floats, and track balances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer
          </Button>
          <Button className="bg-axis-blue hover:bg-blue-800">
            <Plus className="mr-2 h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
              {account.type === "Bank" ? (
                <Landmark className="h-4 w-4 text-muted-foreground" />
              ) : (
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {account.currency} {(account.balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {account.bank} • {account.number}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {account.type}
                </Badge>
                <Button variant="ghost" size="sm" className="h-8 text-axis-blue">
                  View Transactions
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table aria-label="Bank accounts list">
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold">Account Name</TableHead>
              <TableHead className="font-semibold">Bank</TableHead>
              <TableHead className="font-semibold">Account Number</TableHead>
              <TableHead className="font-semibold">Currency</TableHead>
              <TableHead className="text-right font-semibold">Balance</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bankAccounts.map((account) => (
              <TableRow key={account.id} className="hover:bg-axis-light/30">
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>{account.bank}</TableCell>
                <TableCell className="font-mono text-xs">{account.number}</TableCell>
                <TableCell>{account.currency}</TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {(account.balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Open menu for ${account.name}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Import Statement</DropdownMenuItem>
                      <DropdownMenuItem>Reconcile</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Edit Details</DropdownMenuItem>
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
