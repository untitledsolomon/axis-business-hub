"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Mail,
  Webhook,
  KeyRound,
  Banknote,
  MessageCircle,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/hooks/use-org";

interface Integration {
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: "connected" | "available" | "planned";
}

interface ResendRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  status?: string;
}

const integrations: Integration[] = [
  {
    name: "Resend (Email)",
    description: "Send invoices, payslips, and notification emails.",
    icon: Mail,
    status: "planned",
  },
  {
    name: "Flutterwave",
    description: "Accept online invoice payments via card and mobile money.",
    icon: Banknote,
    status: "planned",
  },
  {
    name: "WhatsApp Business",
    description: "Deliver invoices and payment reminders via WhatsApp.",
    icon: MessageCircle,
    status: "planned",
  },
  {
    name: "Google Calendar",
    description: "Sync leave calendars and payroll run dates.",
    icon: Calendar,
    status: "planned",
  },
  {
    name: "Webhooks",
    description: "Send real-time event data to an external system.",
    icon: Webhook,
    status: "planned",
  },
  {
    name: "API Keys",
    description: "Generate keys for custom integrations.",
    icon: KeyRound,
    status: "planned",
  },
];

const statusConfig: Record<Integration["status"], { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-success-soft text-success" },
  available: { label: "Available", className: "bg-primary-soft text-primary" },
  planned: { label: "Coming Soon", className: "bg-muted text-muted-foreground" },
};

export function ConnectionsView() {
  const { currentOrg } = useOrg();
  const [connection, setConnection] = useState<{ status: string; verified_at: string | null; last_error: string | null; config: { domain?: string } } | null>(null);
  const [records, setRecords] = useState<ResendRecord[]>([]);
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnection = async () => {
    if (!currentOrg) return;
    const response = await fetch(`/api/connections/resend?orgId=${encodeURIComponent(currentOrg.id)}`);
    const body = await response.json() as { connection?: typeof connection; domain?: { records?: ResendRecord[] }; error?: string };
    if (response.ok) setConnection(body.connection ?? null);
    if (response.ok && body.domain?.records) setRecords(body.domain.records);
  };

  useEffect(() => {
    void loadConnection();
  }, [currentOrg?.id]);

  const updateResend = async (action: "register" | "verify") => {
    if (!currentOrg) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/connections/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: currentOrg.id, action, domain: domain.trim() }),
      });
      const body = await response.json() as { connection?: typeof connection; domain?: { records?: ResendRecord[] }; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not update Resend connection");
      setConnection(body.connection ?? null);
      setRecords(body.domain?.records ?? records);
      setDomain("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update Resend connection");
    } finally {
      setIsLoading(false);
    }
  };

  const resendStatus = connection?.status === "connected" ? "connected" : connection?.status === "error" ? "available" : "planned";
  return (
    <>
      <PageHeader
        title="Connections"
        description="Connect Axis to the tools you already use. These integrations are on our roadmap — reach out if one of these is a priority for your business."
      />

      <div className="">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const currentStatus = integration.name === "Resend (Email)" ? resendStatus : integration.status;
            const status = statusConfig[currentStatus];
            return (
              <div key={integration.name} className="panel flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
                    <integration.icon size={18} />
                  </span>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", status.className)}>
                    {status.label}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{integration.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
                </div>
                <Button variant="outline" size="sm" disabled={integration.name !== "Resend (Email)"} className="mt-1 w-fit" onClick={() => integration.name === "Resend (Email)" && document.getElementById("resend-connection")?.scrollIntoView({ behavior: "smooth" })}>
                  {integration.name === "Resend (Email)" ? connection ? "Manage" : "Connect" : "Coming soon"}
                </Button>
              </div>
            );
          })}
        </div>
        <section id="resend-connection" className="mt-6 max-w-2xl panel p-5">
          <h2 className="font-medium text-foreground">Resend sending domain</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use your own verified domain for invoice email. Sending falls back to the default Axis domain until verification is complete.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm" placeholder="mail.example.com" value={domain} onChange={(event) => setDomain(event.target.value)} disabled={isLoading} />
            <Button size="sm" onClick={() => void updateResend("register")} disabled={isLoading || !domain.trim()}>{isLoading ? "Saving..." : "Register domain"}</Button>
            <Button size="sm" variant="outline" onClick={() => void updateResend("verify")} disabled={isLoading || !connection}>{"Check verification"}</Button>
          </div>
          {connection?.config.domain && <p className="mt-3 text-sm text-foreground">Domain: <span className="font-medium">{connection.config.domain}</span> <span className="text-muted-foreground">({connection.status})</span></p>}
          {records.length > 0 && <div className="mt-4 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required DNS records</p>{records.map((record) => <div key={`${record.type}-${record.name}-${record.value}`} className="rounded-md border border-border bg-muted/30 p-3 text-xs"><p className="font-medium text-foreground">{record.record} {record.type}</p><p className="mt-1 break-all text-muted-foreground">Name: {record.name}</p><p className="mt-1 break-all text-muted-foreground">Value: {record.value}</p></div>)}</div>}
          {connection?.status === "pending" && <p className="mt-2 text-sm text-warning-foreground">Add the DNS records shown in Resend, then check verification again.</p>}
          {(error || connection?.last_error) && <p className="mt-2 text-sm text-destructive">{error ?? connection?.last_error}</p>}
        </section>
      </div>
    </>
  );
}
