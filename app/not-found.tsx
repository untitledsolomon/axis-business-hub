import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-axis-light px-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-axis-blue/10 text-axis-blue mb-6">
          <Compass size={32} />
        </div>
        <p className="text-sm font-semibold tracking-wide text-axis-blue uppercase mb-2">
          404 error
        </p>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          We can&apos;t find that page
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for may have been moved, renamed, or
          doesn&apos;t exist. Let&apos;s get you back on track.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home size={16} />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">Go to Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
