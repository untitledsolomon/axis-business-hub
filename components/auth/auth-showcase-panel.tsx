"use client";

import { useEffect, useState } from "react";

/**
 * Beehiiv-style rotating hero — v2.
 *
 * Beehiiv's actual layout (confirmed from beehiiv.com hero images):
 * NOT four small corner-pinned widgets. It's THREE large "browser window"
 * panels cascading diagonally, back-to-front, each offset down-and-right
 * of the one behind it. Each window is close to full width/height of the
 * stage — the ones behind are just partially covered (not shrunk), so
 * roughly half of the back window peeks out on the left/top, half of the
 * middle window peeks out, and the front window is fully visible.
 * Titles sit top-left inside each window (not centered), like a real
 * app screen. The whole 3-window stack then crossfades + slides down
 * as a unit when rotating to the next scene.
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

  useEffect(() => {
    const id = setInterval(() => {
      setScene((s) => (s + 1) % SCENE_COUNT);
    }, SCENE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:w-1/2 lg:flex-col lg:justify-between m-3 rounded-3xl border border-white/10 shadow-lg p-6 sm:p-8 lg:p-10">
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

      {/* Headline copy — top of panel now, not middle */}
      <div
        className={`relative z-10 max-w-md transition-all duration-700 ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <p className="font-display text-2xl font-semibold leading-tight tracking-tight text-sidebar-foreground sm:text-3xl lg:text-4xl">
          Run billing, inventory, and reporting from one place.
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-sidebar-foreground/70 sm:text-base">
          Axis keeps your books, stock, and customers in sync — no
          spreadsheets required.
        </p>
      </div>

      {/* ---------------- WINDOW STACK STAGE ---------------- */}
      <div className="relative z-10 mt-8 flex-1">
        <div className="absolute inset-0">
          <WindowStack active={scene === 0 && mounted}>
            <AppWindow depth={2} title="Business pulse" badge="Live">
              <div className="mt-2 flex gap-1 rounded-lg bg-muted p-0.5">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setView(tab.key)}
                    className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors ${
                      view === tab.key
                        ? "bg-surface text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </span>
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-teal" />
              </div>
              <p
                key={view}
                className="numeric animate-fade-in mt-1 font-display text-lg font-semibold text-foreground sm:text-xl"
              >
                {metric.value}
              </p>
              <p
                className={`text-[10px] font-medium ${
                  metric.positive ? "text-success" : "text-destructive"
                }`}
              >
                {metric.delta} vs last month
              </p>

              <div className="mt-2 flex h-6 items-end gap-1 sm:h-8">
                {[40, 65, 45, 80, 60, 90, 70, 55, 85, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-teal-soft transition-all duration-300 hover:bg-teal"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </AppWindow>

            <AppWindow depth={1} title="Revenue target" badge="On track">
              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-0.5">
                <span className="font-display text-lg font-bold text-foreground sm:text-xl">
                  UGX 18.4M
                </span>
                <span className="text-[10px] font-medium text-success">+12.5%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Target: UGX 25.0M</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[74%] rounded-full bg-teal" />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="rounded-lg border border-white/10 bg-surface/60 p-1.5">
                  <p className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Pending
                  </p>
                  <p className="mt-0.5 font-display text-xs font-semibold text-foreground">
                    UGX 3.2M
                  </p>
                  <p className="text-[8px] text-muted-foreground">14 invoices</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-surface/60 p-1.5">
                  <p className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Paid
                  </p>
                  <p className="mt-0.5 font-display text-xs font-semibold text-teal">UGX 41.2M</p>
                  <p className="text-[8px] text-muted-foreground">82 invoices</p>
                </div>
              </div>
            </AppWindow>

            <AppWindow depth={0} title="Your team" badge="Online">
              <div className="mt-2 flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {[{ c: "#F2A65A" }, { c: "#5FA8D3" }, { c: "#8B5CF6" }].map((a, i) => (
                    <div
                      key={i}
                      className="h-5 w-5 rounded-full border-2 border-surface shadow-raised sm:h-6 sm:w-6"
                      style={{ backgroundColor: a.c }}
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-foreground">
                    3 teammates active
                  </p>
                  <p className="truncate text-[9px] text-muted-foreground">
                    Reviewing this month&apos;s books
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Reconciled today</span>
                  <span className="font-medium text-foreground">46 transactions</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Awaiting approval</span>
                  <span className="font-medium text-foreground">5 invoices</span>
                </div>
              </div>
            </AppWindow>
          </WindowStack>

          <WindowStack active={scene === 1 && mounted}>
            <AppWindow depth={2} title="Stock overview" badge="Synced">
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Items tracked</span>
                  <span className="text-[10px] font-semibold text-foreground">1,284</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Low stock alerts</span>
                  <span className="text-[10px] font-semibold text-destructive">6</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Reorder pending</span>
                  <span className="text-[10px] font-semibold text-foreground">3</span>
                </div>
              </div>
              <div className="mt-2 flex h-6 items-end gap-1 sm:h-8">
                {[55, 40, 70, 50, 85, 65, 95, 60, 45, 80].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-teal-soft transition-all duration-300 hover:bg-teal"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </AppWindow>

            <AppWindow depth={1} title="Customers" badge="+18.2%">
              <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-0.5">
                <span className="font-display text-lg font-bold text-foreground sm:text-xl">
                  128
                </span>
                <span className="text-[10px] font-medium text-success">new this month</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[58%] rounded-full bg-teal" />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div className="rounded-lg border border-white/10 bg-surface/60 p-1.5">
                  <p className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Gross margin
                  </p>
                  <p className="mt-0.5 font-display text-xs font-semibold text-teal">42.6%</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-surface/60 p-1.5">
                  <p className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Net profit
                  </p>
                  <p className="mt-0.5 font-display text-xs font-semibold text-foreground">
                    UGX 9.1M
                  </p>
                </div>
              </div>
            </AppWindow>

            <AppWindow depth={0} title="Reports" badge="Auto-generated">
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/20 text-[10px] text-teal sm:h-6 sm:w-6">
                  ✓
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-foreground">
                    Q3 report ready
                  </p>
                  <p className="truncate text-[9px] text-muted-foreground">
                    Generated 2 minutes ago
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Profit &amp; loss</span>
                  <span className="font-medium text-foreground">Ready</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Tax summary</span>
                  <span className="font-medium text-foreground">Ready</span>
                </div>
              </div>
            </AppWindow>
          </WindowStack>
        </div>
      </div>

      {/* Scene indicator dots */}
      <div className="relative z-10 mt-4 flex gap-1.5">
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
 * A stack of 3 AppWindows cascading diagonally. Drives the beehiiv-style
 * scene transition: inactive stack slides up slightly + fades out,
 * active stack slides down into place + fades in.
 */
function WindowStack({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 transition-all duration-700 ease-out ${
        active
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-6 pointer-events-none"
      }`}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}

/**
 * A single "browser window" panel. `depth` controls the cascade offset:
 *   depth 2 = furthest back, top-left, most covered
 *   depth 1 = middle
 *   depth 0 = frontmost, fully visible, bottom-right-most
 * Each window is close to full stage size (not a small card), so the
 * ones behind peek out roughly half-covered — matching beehiiv.
 */
function AppWindow({
  depth,
  title,
  badge,
  children,
}: {
  depth: 0 | 1 | 2;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  // Cascade offsets — each window steps down-and-RIGHT of the one behind it
  // by a FIXED margin (not a shrinking percentage), so the back window's
  // top-left corner always peeks out by the same visible strip, at any
  // panel size. depth 2 = back (anchored top-left), depth 0 = front
  // (anchored bottom-right of the stack).
  const offsets = {
    2: "left-0 top-0 right-[22%] bottom-[22%]",
    1: "left-[11%] top-[11%] right-[11%] bottom-[11%]",
    0: "left-[22%] top-[22%] right-0 bottom-0",
  } as const;

  const z = { 2: "z-10", 1: "z-20", 0: "z-30" } as const;

  return (
    <div
      className={`absolute ${offsets[depth]} ${z[depth]} overflow-hidden rounded-xl border border-white/15 bg-surface/95 shadow-pop ring-1 ring-black/5 backdrop-blur-md transition-all duration-700`}
      style={{ transitionDelay: `${depth === 2 ? 0 : depth === 1 ? 120 : 240}ms` }}
    >
      <div className="flex h-full flex-col overflow-hidden p-3 sm:p-4">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="truncate text-[11px] font-semibold text-foreground sm:text-xs">
            {title}
          </p>
          {badge && (
            <span className="shrink-0 rounded-full bg-teal/10 px-1.5 py-0.5 text-[9px] font-semibold text-teal">
              {badge}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden text-[11px]">{children}</div>
      </div>
    </div>
  );
}