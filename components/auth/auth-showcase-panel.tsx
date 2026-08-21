"use client";

import { useEffect, useState } from "react";

type MetricView = "revenue" | "invoices" | "stock";

const METRICS: Record<
  MetricView,
  { label: string; value: string; delta: string; positive: boolean }
> = {
  revenue: { label: "Revenue this month", value: "UGX 18.4M", delta: "+12.6%", positive: true },
  invoices: { label: "Invoices outstanding", value: "UGX 3.2M", delta: "-8.1%", positive: true },
  stock: { label: "Stock value on hand", value: "UGX 41.7M", delta: "+2.3%", positive: true },
};

const TABS: { key: MetricView; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "invoices", label: "Invoices" },
  { key: "stock", label: "Stock" },
];

export function AuthShowcasePanel() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<MetricView>("revenue");
  const metric = METRICS[view];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative hidden overflow-hidden bg-sidebar lg:block lg:w-1/2 m-3 rounded-3xl border border-white/10 shadow-lg">
      {/* Gradient render backdrop, standing in for the reference's team photo */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "url('./blue-abstract-gradient.jpg'), linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#172554",
        }}
      />
      {/* Fine grain / mesh texture for a "rendered" feel rather than flat color */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 60%, white 0%, transparent 2%), radial-gradient(circle at 70% 20%, white 0%, transparent 1.5%)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Vignette so floating widgets stay legible at the edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 via-sidebar/10 to-transparent" />

      {/* Widget 1: top-left analytics/summary card */}
      <div
        className={`absolute left-10 top-10 w-72 overflow-hidden rounded-2xl border border-white/15 bg-surface/95 p-4 shadow-pop ring-1 ring-black/5 backdrop-blur-md transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Overview
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">Business pulse</p>
          </div>
          <span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-semibold text-teal">
            Live
          </span>
        </div>
        <div className="mt-4 flex gap-1 rounded-lg bg-muted p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                view === tab.key
                  ? "bg-surface text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </span>
          <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
        </div>
        <p
          key={view}
          className="numeric animate-fade-in mt-2 font-display text-3xl font-semibold text-foreground"
        >
          {metric.value}
        </p>
        <p
          className={`mt-1 text-xs font-medium ${
            metric.positive ? "text-success" : "text-destructive"
          }`}
        >
          {metric.delta} vs last month
        </p>

        <div className="mt-4 flex h-10 items-end gap-1">
          {[40, 65, 45, 80, 60, 90, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-teal-soft transition-all duration-300 hover:bg-teal"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* Widget 2: bottom-left revenue-vs-target card with progress bar */}
      <div
        className={`absolute bottom-10 left-10 w-64 rounded-2xl border border-teal/20 bg-gradient-to-br from-surface/95 to-teal/10 p-4 shadow-pop backdrop-blur-md transition-all delay-150 duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revenue target
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              Target: UGX 25.0M
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-teal" />
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className="font-display text-2xl font-bold text-foreground">
            UGX 18.4M
          </span>
          <span className="mb-1 flex items-center text-xs font-medium text-success">
            +12.5%
          </span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[74%] rounded-full bg-teal" />
        </div>
      </div>

      {/* Widget 3: right-side avatar stack */}
      <div
        className={`absolute right-10 top-10 flex items-center gap-3 rounded-2xl border border-white/20 bg-sidebar/70 px-3 py-2 shadow-pop backdrop-blur-md transition-all delay-300 duration-700 ${
          mounted ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
        }`}
      >
        <div className="flex -space-x-2">
          {[
            { c: "#F2A65A", size: "h-9 w-9" },
            { c: "#5FA8D3", size: "h-9 w-9" },
          ].map((a, i) => (
            <div
              key={i}
              className={`${a.size} rounded-full border-2 border-surface shadow-raised`}
              style={{ backgroundColor: a.c }}
            />
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Your team</p>
          <p className="text-[10px] text-muted-foreground">Online now</p>
        </div>
      </div>

      {/* Widget 4: bottom-right glass invoice summary */}
      <div
        className={`absolute bottom-10 right-10 w-52 rounded-2xl border border-white/25 bg-white/15 p-4 text-sidebar-foreground shadow-pop backdrop-blur-xl transition-all delay-500 duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/70">
          Active invoices
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Pending</p>
              <p className="text-[10px] text-sidebar-foreground/60">14 invoices</p>
            </div>
            <p className="font-display font-bold">UGX 3.2M</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Paid</p>
              <p className="text-[10px] text-sidebar-foreground/60">82 invoices</p>
            </div>
            <p className="font-display font-bold text-teal">UGX 41.2M</p>
          </div>
        </div>
      </div>

      {/* Headline copy, anchored bottom so it reads beneath the widget cluster */}
      <div
        className={`absolute left-10 right-10 top-[52%] max-w-md transition-all delay-100 duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <p className="font-display text-3xl font-semibold leading-tight tracking-tight text-sidebar-foreground lg:text-4xl">
          Run billing, inventory, and reporting from one place.
        </p>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-sidebar-foreground/70">
          Axis keeps your books, stock, and customers in sync — no
          spreadsheets required.
        </p>
      </div>
    </div>
  );
}