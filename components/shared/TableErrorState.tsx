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
        <div className="flex flex-col items-center justify-center space-y-2">
          <AlertTriangle className="h-10 w-10 text-axis-red opacity-70" />
          <h3 className="text-lg font-semibold">Couldn&apos;t load this data</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {message || "Something went wrong while fetching this from the server. Please try again."}
          </p>
          {onRetry && (
            <Button variant="outline" className="mt-2 border-axis-red text-axis-red" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
