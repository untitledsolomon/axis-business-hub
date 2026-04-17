"use client";

import { use } from "react";
import { ArrowLeft, Mail, Phone, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/clients"><ArrowLeft size={20} /></Link></Button>
        <h1 className="text-3xl font-bold text-axis-blue">Client Details</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Mail size={14} /> contact@acme.com</div>
            <div className="flex items-center gap-2"><Phone size={14} /> +1 (555) 000-1111</div>
            <div className="flex items-center gap-2"><Building size={14} /> Acme Corporation</div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList><TabsTrigger value="overview">Overview</TabsTrigger></TabsList>
            <TabsContent value="overview" className="pt-4">
              <Card><CardContent className="pt-6 text-sm text-muted-foreground">Historical data and invoices for this client.</CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
