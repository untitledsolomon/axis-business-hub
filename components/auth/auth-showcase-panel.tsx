"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Beehiiv-style rotating hero — v3.
 *
 * - Three cascading "app windows" per scene, offset diagonally by a fixed
 *   margin so each one peeks out from behind the next (matches beehiiv).
 * - Two scenes auto-rotate on a timer; hovering the stack pauses rotation.
 * - Each window is independently clickable — clicking a partially-covered
 *   window brings it to the front (reorders z-depth) instead of only ever
 *   being able to look at the frontmost one.
 * - Windows have real visual texture now: sparkline paths, a donut ring,
 *   layered bars, colored accent washes — not just stacked text rows.
 */

type MetricView = "revenue" | "invoices" | "stock";

const METRICS: Record<
  MetricView,
  { label: string; value: string; delta: string; positive: boolean; points: number[] }
> = {
  revenue: {
    label: "Revenue this month",
    value: "UGX 18.4M",
    delta: "+12.6%",
    positive: true,
    points: [30, 45, 38, 52, 48, 65, 58, 72, 68, 80, 76, 90],
  },
  invoices: {
    label: "Invoices outstanding",
    value: "UGX 3.2M",
    delta: "-8.1%",
    positive: true,
    points: [70, 65, 68, 58, 60, 50, 52, 44, 46, 38, 40, 32],
  },
  stock: {
    label: "Stock value on hand",
    value: "UGX 41.7M",
    delta: "+2.3%",
    positive: true,
    points: [55, 58, 54, 60, 57, 62, 59, 63, 61, 66, 64, 68],
  },
};

const TABS: { key: MetricView; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "invoices", label: "Invoices" },
  { key: "stock", label: "Stock" },
];

const SCENE_DURATION_MS = 5000;
const SCENE_COUNT = 2;
const WINDOW_IDS = [0, 1, 2] as const;
type WindowId = (typeof WINDOW_IDS)[number];

/** Builds a smooth SVG path from a list of 0-100 values. */
function sparklinePath(points: number[], width: number, height: number) {
  const step = width / (points.length - 1);
  const coords = points.map((p, i) => [i * step, height - (p / 100) * height]);
  return coords
    .map(([x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`))
    .join(" ");
}

export function AuthShowcasePanel() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<MetricView>("revenue");
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);
  // Per-scene front order: last item in the array is drawn frontmost.
  const [order, setOrder] = useState<Record<number, WindowId[]>>({
    0: [2, 1, 0],
    1: [2, 1, 0],
  });
  const metric = METRICS[view];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setScene((s) => (s + 1) % SCENE_COUNT);
    }, SCENE_DURATION_MS);
    return () => clearInterval(id);
  }, [paused]);

  const bringToFront = (sceneIndex: number, windowId: WindowId) => {
    setOrder((prev) => {
      const current = prev[sceneIndex];
      const next = [...current.filter((id) => id !== windowId), windowId];
      return { ...prev, [sceneIndex]: next };
    });
  };

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

      {/* Headline copy */}
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
      <div
        className="relative z-10 mt-8 flex-1"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0">
          <WindowStack active={scene === 0 && mounted}>
            {order[0].map((id, i) => {
              const depth = (order[0].length - 1 - i) as 0 | 1 | 2;
              if (id === 0) {
                return (
                  <AppWindow
                    key="business-pulse"
                    depth={depth}
                    accent="teal"
                    title="Business pulse"
                    badge="Live"
                    onFocus={() => bringToFront(0, 0)}
                  >
                    <div className="mt-2.5 flex gap-1 rounded-lg bg-muted p-1">
                      {TABS.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={(e) => {
                            e.stopPropagation();
                            setView(tab.key);
                          }}
                          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                            view === tab.key
                              ? "bg-surface text-foreground shadow-card"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {metric.label}
                      </span>
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-teal" />
                    </div>
                    <p
                      key={view}
                      className="numeric animate-fade-in mt-1 font-display text-2xl font-semibold text-foreground sm:text-3xl"
                    >
                      {metric.value}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        metric.positive ? "text-success" : "text-destructive"
                      }`}
                    >
                      {metric.delta} vs last month
                    </p>

                    <Sparkline points={metric.points} className="mt-3 text-teal" />
                  </AppWindow>
                );
              }
              if (id === 1) {
                return (
                  <AppWindow
                    key="revenue-target"
                    depth={depth}
                    accent="violet"
                    title="Revenue target"
                    badge="On track"
                    onFocus={() => bringToFront(0, 1)}
                  >
                    <div className="mt-3 flex items-center gap-4">
                      <DonutRing percent={74} className="text-violet-400" />
                      <div>
                        <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5">
                          <span className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                            UGX 18.4M
                          </span>
                          <span className="text-xs font-medium text-success">+12.5%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Target: UGX 25.0M</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/10 bg-surface/60 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Pending
                        </p>
                        <p className="mt-0.5 font-display text-sm font-semibold text-foreground">
                          UGX 3.2M
                        </p>
                        <p className="text-[10px] text-muted-foreground">14 invoices</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-surface/60 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Paid
                        </p>
                        <p className="mt-0.5 font-display text-sm font-semibold text-teal">
                          UGX 41.2M
                        </p>
                        <p className="text-[10px] text-muted-foreground">82 invoices</p>
                      </div>
                    </div>
                  </AppWindow>
                );
              }
              return (
                <AppWindow
                  key="your-team"
                  depth={depth}
                  accent="amber"
                  title="Your team"
                  badge="Online"
                  onFocus={() => bringToFront(0, 2)}
                >
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {[{ c: "#F2A65A" }, { c: "#5FA8D3" }, { c: "#8B5CF6" }].map((a, i) => (
                        <div
                          key={i}
                          className="h-8 w-8 rounded-full border-2 border-surface shadow-raised sm:h-9 sm:w-9"
                          style={{ backgroundColor: a.c }}
                        />
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        3 teammates active
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Reviewing this month&apos;s books
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-surface/60 px-2.5 py-2 text-xs">
                      <span className="text-muted-foreground">Reconciled today</span>
                      <span className="font-medium text-foreground">46 transactions</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-surface/60 px-2.5 py-2 text-xs">
                      <span className="text-muted-foreground">Awaiting approval</span>
                      <span className="font-medium text-foreground">5 invoices</span>
                    </div>
                  </div>
                </AppWindow>
              );
            })}
          </WindowStack>

          <WindowStack active={scene === 1 && mounted}>
            {order[1].map((id, i) => {
              const depth = (order[1].length - 1 - i) as 0 | 1 | 2;
              if (id === 0) {
                return (
                  <AppWindow
                    key="stock-overview"
                    depth={depth}
                    accent="teal"
                    title="Stock overview"
                    badge="Synced"
                    onFocus={() => bringToFront(1, 0)}
                  >
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-white/10 bg-surface/60 p-2.5">
                        <p className="text-[10px] text-muted-foreground">Tracked</p>
                        <p className="mt-0.5 font-display text-base font-semibold text-foreground">
                          1,284
                        </p>
                      </div>
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                        <p className="text-[10px] text-muted-foreground">Low stock</p>
                        <p className="mt-0.5 font-display text-base font-semibold text-destructive">
                          6
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-surface/60 p-2.5">
                        <p className="text-[10px] text-muted-foreground">Reorder</p>
                        <p className="mt-0.5 font-display text-base font-semibold text-foreground">
                          3
                        </p>
                      </div>
                    </div>
                    <Sparkline points={METRICS.stock.points} className="mt-3 text-teal" />
                  </AppWindow>
                );
              }
              if (id === 1) {
                return (
                  <AppWindow
                    key="customers"
                    depth={depth}
                    accent="violet"
                    title="Customers"
                    badge="+18.2%"
                    onFocus={() => bringToFront(1, 1)}
                  >
                    <div className="mt-3 flex items-center gap-4">
                      <DonutRing percent={58} className="text-teal" />
                      <div>
                        <span className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                          128
                        </span>
                        <p className="text-xs font-medium text-success">new this month</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/10 bg-surface/60 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Gross margin
                        </p>
                        <p className="mt-0.5 font-display text-sm font-semibold text-teal">
                          42.6%
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-surface/60 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Net profit
                        </p>
                        <p className="mt-0.5 font-display text-sm font-semibold text-foreground">
                          UGX 9.1M
                        </p>
                      </div>
                    </div>
                  </AppWindow>
                );
              }
              return (
                <AppWindow
                  key="reports"
                  depth={depth}
                  accent="amber"
                  title="Reports"
                  badge="Auto-generated"
                  onFocus={() => bringToFront(1, 2)}
                >
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/20 text-sm text-teal">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        Q3 report ready
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Generated 2 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-surface/60 px-2.5 py-2 text-xs">
                      <span className="text-muted-foreground">Profit &amp; loss</span>
                      <span className="font-medium text-teal">Ready</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-surface/60 px-2.5 py-2 text-xs">
                      <span className="text-muted-foreground">Tax summary</span>
                      <span className="font-medium text-teal">Ready</span>
                    </div>
                  </div>
                </AppWindow>
              );
            })}
          </WindowStack>
        </div>
      </div>

      {/* Scene indicator dots */}
      <div className="relative z-10 mt-4 flex items-center gap-3">
        <div className="flex gap-1.5">
          {Array.from({ length: SCENE_COUNT }).map((_, i) => (
            <button
              key={i}
              onClick={() => setScene(i)}
              aria-label={`Show scene ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === scene ? "w-4 bg-teal" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
        {paused && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
            Paused
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A stack of 3 AppWindows cascading diagonally. Drives the beehiiv-style
 * scene transition: inactive stack fades out, active stack slides down
 * into place + fades in.
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

const ACCENTS = {
  teal: {
    wash: "from-teal/15 via-transparent to-transparent",
    bar: "bg-teal",
  },
  violet: {
    wash: "from-violet-400/15 via-transparent to-transparent",
    bar: "bg-violet-400",
  },
  amber: {
    wash: "from-amber-400/15 via-transparent to-transparent",
    bar: "bg-amber-400",
  },
} as const;

/**
 * A single "browser window" panel. `depth` controls the cascade offset:
 *   depth 2 = furthest back, top-left, most covered
 *   depth 1 = middle
 *   depth 0 = frontmost, fully visible, bottom-right-most
 * Clicking any window (via onFocus) brings it to depth 0.
 */
function AppWindow({
  depth,
  title,
  badge,
  accent,
  onFocus,
  children,
}: {
  depth: 0 | 1 | 2;
  title: string;
  badge?: string;
  accent: keyof typeof ACCENTS;
  onFocus?: () => void;
  children: React.ReactNode;
}) {
  // Fixed-percentage offsets anchored to opposite corners so the back
  // window's top-left corner always peeks out by a consistent strip,
  // regardless of panel size.
  const offsets = {
    2: "left-0 top-0 right-[22%] bottom-[22%]",
    1: "left-[11%] top-[11%] right-[11%] bottom-[11%]",
    0: "left-[22%] top-[22%] right-0 bottom-0",
  } as const;

  const z = { 2: "z-10", 1: "z-20", 0: "z-30" } as const;
  const accentClasses = ACCENTS[accent];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onFocus?.();
      }}
      style={{ transitionDelay: `${depth === 2 ? 0 : depth === 1 ? 120 : 240}ms` }}
      className={`absolute ${offsets[depth]} ${z[depth]} block overflow-hidden rounded-xl border border-white/15 bg-surface/95 text-left shadow-pop ring-1 ring-black/5 backdrop-blur-md transition-all duration-700 ${
        depth !== 0 ? "cursor-pointer hover:brightness-110" : "cursor-default"
      }`}
    >
      {/* Colored accent wash, unique per window */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClasses.wash}`} />

      <div className="relative flex h-full flex-col overflow-hidden p-4 sm:p-5">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accentClasses.bar}`} />
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</p>
          </div>
          {badge && (
            <span className="shrink-0 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">
              {badge}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/** Small filled sparkline area chart. */
function Sparkline({ points, className = "" }: { points: number[]; className?: string }) {
  const width = 300;
  const height = 56;
  const linePath = useMemo(() => sparklinePath(points, width, height), [points]);
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-12 w-full sm:h-14 ${className}`}
      preserveAspectRatio="none"
    >
      <path d={areaPath} fill="currentColor" opacity={0.12} />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Small circular progress ring. */
function DonutRing({ percent, className = "" }: { percent: number; className?: string }) {
  const size = 56;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`shrink-0 ${className}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-[13px] font-semibold"
      >
        {percent}%
      </text>
    </svg>
  );
}