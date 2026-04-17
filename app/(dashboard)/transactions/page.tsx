"use client";

import { useState } from "react";
import { Plus, Search, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/lib/types";

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "income",
    category: "sales",
    amount: 5500,
    date: "2024-03-25",
    description: "Invoice #INV-001 Payment",
    createdAt: "2024-03-25",
    updatedAt: "2024-03-25",
  },
  {
    id: "2",
    type: "expense",
    category: "payroll",
    amount: 3200,
    date: "2024-03-31",
    description: "March Salaries",
    createdAt: "2024-03-31",
    updatedAt: "2024-03-31",
  },
];

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = mockTransactions.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Transactions</h1>
        <Button className="bg-axis-blue hover:bg-blue-800">
          <Plus className="mr-2 h-4 w-4" /> Record Transaction
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Income</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-axis-green">+$5,500</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Expenses</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-axis-red">-$3,200</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Net</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">$2,300</div></CardContent></Card>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell className={`text-right font-semibold ${t.type === "income" ? "text-axis-green" : "text-axis-red"}`}>
                  {t.type === "income" ? "+" : "-"}${t.amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
