import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Standard page header used across all list/view pages (Clients, Invoices,
 * Ledger, Banking, Accounts, Transactions, Dashboard). Consolidates the
 * title/description/actions layout that was previously hand-rolled with
 * slightly different markup on every page.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
