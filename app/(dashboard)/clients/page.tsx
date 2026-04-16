"use client";

import { useState } from "react";
import { Plus, Search, MoreHorizontal, User } from "lucide-react";
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
import { Client } from "@/lib/types";
import Link from "next/link";

// Mock data for demonstration
const mockClients: Client[] = [
  {
    id: "1",
    name: "Acme Corp",
    email: "contact@acme.com",
    company: "Acme Corporation",
    status: "active",
    createdAt: "2024-01-15",
    updatedAt: "2024-03-20",
  },
  {
    id: "2",
    name: "Global Tech",
    email: "info@globaltech.io",
    company: "Global Tech Solutions",
    status: "active",
    createdAt: "2024-02-10",
    updatedAt: "2024-03-22",
  },
  {
    id: "3",
    name: "Sarah Miller",
    email: "sarah@design.co",
    company: "Freelance",
    status: "lead",
    createdAt: "2024-03-01",
    updatedAt: "2024-03-01",
  },
];

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = mockClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-axis-green hover:bg-green-700">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "lead":
        return <Badge className="bg-axis-blue hover:bg-blue-800">Lead</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Clients</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships and contact information.
          </p>
        </div>
        <Button className="bg-axis-blue hover:bg-blue-800 gap-2">
          <Plus size={18} /> Add Client
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-8 bg-white border-none shadow-sm focus-visible:ring-axis-blue"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-axis-light hover:bg-axis-light">
              <TableHead>Client Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-axis-light/50">
                  <TableCell className="font-medium">
                    <Link href={`/clients/${client.id}`} className="hover:underline flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-axis-light flex items-center justify-center text-axis-blue">
                         <User size={16} />
                      </div>
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>{client.company || "-"}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell>{client.createdAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={18} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                           <Link href={`/clients/${client.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit Client</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-axis-red">Delete Client</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No clients found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
