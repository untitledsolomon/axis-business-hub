"use client";

import { useEffect, useState } from "react";

/**
 * Beehiiv-style rotating hero.
 *
 * How beehiiv actually does it (confirmed from beehiiv.com):
 * They don't animate individual floating widgets independently forever —
 * they pre-compose TWO full "scenes" (each scene = a cluster of cards,
 * baked together as one image on their site) and crossfade + slide-down
 * between the two scenes on an interval. Only the ACTIVE scene animates
 * in; the outgoing one just fades out. That's the "nice simple slide
 * down with some fade" you're seeing.
 *
 * Below, instead of static images, we build two real composed scenes
 * from your Axis widgets (Scene A: Business pulse + Revenue target +
 * Team + Invoices — your original layout — Scene B: a second variant)
 * and crossfade/slide between them on a timer, same as beehiiv.
 */

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

const SCENE_DURATION_MS = 5000;
const SCENE_COUNT = 2;

export function AuthShowcasePanel() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<MetricView>("revenue");
  const [scene, setScene] = useState(0);
  const metric = METRICS[view];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Rotate scenes on an interval, beehiiv-style.
  useEffect(() => {
    const id = setInterval(() => {
      setScene((s) => (s + 1) % SCENE_COUNT);
    }, SCENE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative hidden overflow-hidden bg-sidebar lg:block lg:w-1/2 m-3 rounded-3xl border border-white/10 shadow-lg">
      {/* Gradient render backdrop */}
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
      {/* Fine grain / mesh texture */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 60%, white 0%, transparent 2%), radial-gradient(circle at 70% 20%, white 0%, transparent 1.5%)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 via-sidebar/10 to-transparent" />

      {/* ---------------- SCENE STAGE ---------------- */}
      {/* Both scenes are stacked in the same box; only the active one is
          interactive/opaque. Crossfade + slide-down handled per scene. */}
      <div className="absolute inset-0">
        {/* Scene A — Business pulse cluster (your original layout) */}
        <SceneWrapper active={scene === 0 && mounted}>
          {/* Widget 1: top-left analytics/summary card */}
          <div className="absolute left-10 top-10 w-72 overflow-hidden rounded-2xl border border-white/15 bg-surface/95 p-4 shadow-pop ring-1 ring-black/5 backdrop-blur-md">
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

          {/* Widget 2: bottom-left revenue-vs-target card */}
          <div
            className="absolute bottom-10 left-10 w-64 rounded-2xl border border-teal/20 bg-gradient-to-br from-surface/95 to-teal/10 p-4 shadow-pop backdrop-blur-md"
            style={{ transitionDelay: "150ms" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Revenue target
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">Target: UGX 25.0M</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-teal" />
            </div>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-2xl font-bold text-foreground">UGX 18.4M</span>
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
            className="absolute right-10 top-10 flex items-center gap-3 rounded-2xl border border-white/20 bg-sidebar/70 px-3 py-2 shadow-pop backdrop-blur-md"
            style={{ transitionDelay: "300ms" }}
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
            className="absolute bottom-10 right-10 w-52 rounded-2xl border border-white/25 bg-white/15 p-4 text-sidebar-foreground shadow-pop backdrop-blur-xl"
            style={{ transitionDelay: "500ms" }}
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
        </SceneWrapper>

        {/* Scene B — Stock & operations cluster (second rotation, beehiiv's 2nd hero) */}
        <SceneWrapper active={scene === 1 && mounted}>
          {/* Widget 1: top-left stock overview card */}
          <div className="absolute left-10 top-10 w-72 overflow-hidden rounded-2xl border border-white/15 bg-surface/95 p-4 shadow-pop ring-1 ring-black/5 backdrop-blur-md">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Inventory
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">Stock overview</p>
              </div>
              <span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-semibold text-teal">
                Synced
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Items tracked</span>
                <span className="text-sm font-semibold text-foreground">1,284</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Low stock alerts</span>
                <span className="text-sm font-semibold text-destructive">6</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Reorder pending</span>
                <span className="text-sm font-semibold text-foreground">3</span>
              </div>
            </div>
            <div className="mt-4 flex h-10 items-end gap-1">
              {[55, 40, 70, 50, 85, 65, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-teal-soft transition-all duration-300 hover:bg-teal"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Widget 2: bottom-left customers card */}
          <div
            className="absolute bottom-10 left-10 w-64 rounded-2xl border border-teal/20 bg-gradient-to-br from-surface/95 to-teal/10 p-4 shadow-pop backdrop-blur-md"
            style={{ transitionDelay: "150ms" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customers
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">New this month</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-teal" />
            </div>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-2xl font-bold text-foreground">128</span>
              <span className="mb-1 flex items-center text-xs font-medium text-success">
                +18.2%
              </span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[58%] rounded-full bg-teal" />
            </div>
          </div>

          {/* Widget 3: right-side reports badge */}
          <div
            className="absolute right-10 top-10 flex items-center gap-3 rounded-2xl border border-white/20 bg-sidebar/70 px-3 py-2 shadow-pop backdrop-blur-md"
            style={{ transitionDelay: "300ms" }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal/20 text-teal">
              ✓
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Reports ready</p>
              <p className="text-[10px] text-muted-foreground">Auto-generated</p>
            </div>
          </div>

          {/* Widget 4: bottom-right glass P&L summary */}
          <div
            className="absolute bottom-10 right-10 w-52 rounded-2xl border border-white/25 bg-white/15 p-4 text-sidebar-foreground shadow-pop backdrop-blur-xl"
            style={{ transitionDelay: "500ms" }}
          >
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/70">
              Profit & loss
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Gross margin</p>
                  <p className="text-[10px] text-sidebar-foreground/60">This quarter</p>
                </div>
                <p className="font-display font-bold text-teal">42.6%</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Net profit</p>
                  <p className="text-[10px] text-sidebar-foreground/60">This quarter</p>
                </div>
                <p className="font-display font-bold">UGX 9.1M</p>
              </div>
            </div>
          </div>
        </SceneWrapper>
      </div>

      {/* Headline copy — stays put, doesn't rotate */}
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

      {/* Scene indicator dots, beehiiv doesn't show these but they help orient during dev */}
      <div className="absolute left-10 top-[46%] flex gap-1.5">
        {Array.from({ length: SCENE_COUNT }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === scene ? "w-4 bg-teal" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Wraps a scene cluster and drives the beehiiv-style transition:
 * inactive → translate-y down slightly + opacity 0 (hidden, no pointer events)
 * active   → translate-y 0 + opacity 100 (slides down into place + fades in)
 *
 * Each direct child can add its own `transitionDelay` inline style to
 * stagger in, same as the original per-widget stagger.
 */
function SceneWrapper({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 transition-all duration-700 ease-out ${
        active
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-4 pointer-events-none"
      }`}
      aria-hidden={!active}
    >
      {/* Stagger children the same way the original widgets did, but only
          when this scene is active — inactive scene doesn't need to animate in. */}
      <div className="contents [&>*]:transition-all [&>*]:duration-700 [&>*]:ease-out">
        {children}
      </div>
    </div>
  );
}