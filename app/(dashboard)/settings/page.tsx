"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Business Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Business Name</Label><Input defaultValue="AXIS Solutions" /></div>
          <div className="space-y-2"><Label>Tax ID</Label><Input defaultValue="12-3456789" /></div>
          <Button className="bg-axis-blue">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
