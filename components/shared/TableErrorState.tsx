import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface TableErrorStateProps {
  colSpan: number;
  message?: string;
  onRetry?: () => void;
}

/**
 * Renders inside a <TableBody> when a query's isError is true. Distinct from
 * the "no data yet" empty state — this means the fetch itself failed (network,
 * RLS denial, expired session), which should never be silently presented as
 * "there's nothing here."
 */
export function TableErrorState({ colSpan, message, onRetry }: TableErrorStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-64 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="rounded-full bg-destructive-soft p-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load this data</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {message || "Something went wrong while fetching this from the server. Please try again."}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
