"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-axis-light px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-axis-red/10 text-axis-red mb-6">
          <AlertTriangle size={32} />
        </div>
        <p className="text-sm font-semibold tracking-wide text-axis-red uppercase mb-2">
          Something went wrong
        </p>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Unexpected error
        </h1>
        <p className="text-muted-foreground mb-8">
          We hit a snag loading this page. You can try again, or head back to
          the dashboard.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={reset} className="flex items-center gap-2">
            <RotateCcw size={16} />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home size={16} />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
