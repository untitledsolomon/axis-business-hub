import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your business performance, recent activities, and key metrics.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-axis-blue">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back to your business operating system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder for Stat Cards */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-lg border bg-card p-4 shadow-sm animate-pulse" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 h-[400px] rounded-lg border bg-card shadow-sm" />
        <div className="col-span-3 h-[400px] rounded-lg border bg-card shadow-sm" />
      </div>
    </div>
  );
}
