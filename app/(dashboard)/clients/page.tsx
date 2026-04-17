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
import { Plus, Search, MoreHorizontal, Mail, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const metadata: Metadata = {
  title: "Clients",
  description: "Manage your client relationships and contact information.",
};

const clients = [
  {
    id: "1",
    name: "Acme Corp",
    email: "billing@acme.com",
    phone: "+1 (555) 000-0001",
    company: "Acme Corporation",
    status: "active",
  },
  {
    id: "2",
    name: "Global Tech",
    email: "accounts@globaltech.io",
    phone: "+1 (555) 000-0002",
    company: "Global Tech Solutions",
    status: "active",
  },
  {
    id: "3",
    name: "Stark Industries",
    email: "tony@stark.com",
    phone: "+1 (555) 000-0003",
    company: "Stark Industries Inc.",
    status: "inactive",
  },
  {
    id: "4",
    name: "Wayne Enterprises",
    email: "bruce@wayne.com",
    phone: "+1 (555) 000-0004",
    company: "Wayne Enterprises Ltd.",
    status: "lead",
  },
  {
    id: "5",
    name: "Initech",
    email: "bill@initech.com",
    phone: "+1 (555) 000-0005",
    company: "Initech Corp.",
    status: "active",
  },
];

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client directory and their financial relationships.
          </p>
        </div>
        <Button className="bg-axis-blue hover:bg-blue-800">
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-8 bg-white border-muted focus-visible:ring-axis-blue"
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div>

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-axis-light/50">
              <TableHead className="font-semibold">Client Name</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} className="hover:bg-axis-light/30">
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.company}</TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Mail className="mr-1 h-3 w-3" /> {client.email}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Phone className="mr-1 h-3 w-3" /> {client.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      client.status === "active" ? "default" :
                      client.status === "inactive" ? "secondary" : "outline"
                    }
                    className={
                      client.status === "active" ? "bg-axis-green/10 text-axis-green hover:bg-axis-green/20 border-axis-green/20" :
                      ""
                    }
                  >
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
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
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Edit client</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Create invoice</DropdownMenuItem>
                      <DropdownMenuItem className="text-axis-red">Delete client</DropdownMenuItem>
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
