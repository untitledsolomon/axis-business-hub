"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useClient } from "@/hooks/clients/use-clients";
import { useInvoicesByClient } from "@/hooks/invoicing/use-invoices";
import { getClientDocumentUrl, useClientDocuments, useDeleteClientDocument, useUploadClientDocument } from "@/hooks/clients/use-client-documents";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ClientActions } from "@/components/clients/ClientActions";
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  FileText,
  Plus,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { formatShortDate } from "@/lib/format-date";
import { formatMoney, convertMinorUnits } from "@/lib/currency";
import { toast } from "sonner";

interface ClientDetailProps {
  clientId: string;
}

export function ClientDetail({ clientId }: ClientDetailProps) {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id || "";

  const { data: client, isLoading, isError, refetch } = useClient(orgId, clientId);
  const { data: invoices, isLoading: invoicesLoading } = useInvoicesByClient(orgId, clientId);
  const { data: documents = [], isLoading: documentsLoading } = useClientDocuments(orgId, clientId);
  const uploadDocument = useUploadClientDocument(orgId, clientId);
  const deleteDocument = useDeleteClientDocument(orgId, clientId);
  const [documentType, setDocumentType] = useState("other");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isError) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <div className="rounded-full bg-destructive-soft p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this client</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong while fetching this from the server. Please try again.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-2 border-dashed py-16 text-center">
        <Users className="h-12 w-12 text-muted-foreground opacity-20" />
        <h3 className="text-sm font-semibold text-foreground">Client not found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          This client may have been deleted, or you may not have access to them.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  const baseCurrency = currentOrg?.base_currency ?? "UGX";

  // An invoice's own currency can differ from client.currency (that field is
  // just the client's default) — convert each invoice to the org's base
  // currency using its own exchange_rate before summing, same as InvoicesList.
  const totals = (invoices ?? []).reduce(
    (acc, inv) => {
      const amountBase = convertMinorUnits(inv.grand_total, inv.currency, baseCurrency, inv.exchange_rate || 1);
      acc.total += amountBase;
      if (inv.status === "paid") acc.paid += amountBase;
      if (inv.status !== "paid" && inv.status !== "voided") acc.outstanding += amountBase;
      return acc;
    },
    { total: 0, paid: 0, outstanding: 0 }
  );

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/clients">
            <ArrowLeft className="size-4" />
            Back to Clients
          </Link>
        </Button>
      </div>

      <PageHeader
        title={client.name}
        description={client.company_name || "No company on file"}
        actions={<ClientActions orgId={orgId} client={client} showViewDetails={false} />}
      />

      <div className="space-y-4">
        <div>
          <StatusBadge status={client.status} />
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Lifetime invoiced</p><p className="numeric mt-1 text-xl font-semibold text-foreground">{formatMoney(totals.total, baseCurrency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Paid to date</p><p className="numeric mt-1 text-xl font-semibold text-success">{formatMoney(totals.paid, baseCurrency)}</p></div>
          <div><p className="text-xs text-muted-foreground">Invoices</p><p className="numeric mt-1 text-xl font-semibold text-foreground">{invoices?.length ?? 0}</p></div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="panel p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Invoice history</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/invoices?client=${client.id}`}>
                  <Plus className="size-4" />
                  New invoice
                </Link>
              </Button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-border p-3 text-sm sm:gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total invoiced</p>
                <p className="numeric font-semibold text-foreground">
                  {formatMoney(totals.total, baseCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="numeric font-semibold text-success">
                  {formatMoney(totals.paid, baseCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="numeric font-semibold text-warning-foreground">
                  {formatMoney(totals.outstanding, baseCurrency)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table aria-label="Client invoice history">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : invoices && invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="numeric font-medium">
                          <Link href={`/invoices/${invoice.id}`} className="hover:text-primary hover:underline">
                            {invoice.invoice_number}
                          </Link>
                        </TableCell>
                        <TableCell className="numeric text-muted-foreground">
                          {formatShortDate(invoice.issue_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="numeric text-right font-medium">
                          {formatMoney(invoice.grand_total, invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground opacity-20" />
                          <p className="text-sm text-muted-foreground">No invoices yet for this client.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold text-foreground">Contact</h2>
            <div className="mt-3 space-y-2">
              {client.contact_person && (
                <p className="text-sm text-foreground">{client.contact_person}</p>
              )}
              {client.email && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" /> {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="size-3.5 shrink-0" /> {client.phone}
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> <span>{client.address}</span>
                </div>
              )}
              {!client.contact_person && !client.email && !client.phone && !client.address && (
                <p className="text-sm text-muted-foreground">No contact details on file.</p>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize text-foreground">{client.type}</span>
              </div>
              {client.tax_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ID</span>
                  <span className="text-foreground">{client.tax_id}</span>
                </div>
              )}
              {client.payment_terms && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment terms</span>
                  <span className="text-foreground">{client.payment_terms}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span className="text-foreground">{client.currency}</span>
              </div>
            </div>

            {client.notes && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{client.notes}</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="panel mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-foreground">Documents</h2><p className="text-xs text-muted-foreground">Contracts, agreements, and client records.</p></div>
          <div className="flex items-center gap-2">
            <select className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={documentType} onChange={(event) => setDocumentType(event.target.value)} aria-label="Document type"><option value="other">Other</option><option value="contract">Contract</option><option value="agreement">Agreement</option><option value="tax">Tax document</option></select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"><FileText className="size-4" /> Upload<input className="sr-only" type="file" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { await uploadDocument.mutateAsync({ file, documentType }); toast.success("Document uploaded"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not upload document"); } event.target.value = ""; }} /></label>
          </div>
        </div>
        <div className="mt-4 divide-y divide-border">{documentsLoading ? <Skeleton className="h-10 w-full" /> : documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded yet.</p> : documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{document.file_name}</p><p className="text-xs text-muted-foreground">{document.document_type} · {formatShortDate(document.uploaded_at)}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label={`Open ${document.file_name}`} onClick={async () => { try { window.open(await getClientDocumentUrl(document.file_url), "_blank", "noopener,noreferrer"); } catch { toast.error("Could not open document"); } }}><ExternalLink className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${document.file_name}`} onClick={async () => { try { await deleteDocument.mutateAsync(document); toast.success("Document deleted"); } catch { toast.error("Could not delete document"); } }}><Trash2 className="size-4 text-destructive" /></Button></div></div>)}</div>
      </section>
    </>
  );
}
