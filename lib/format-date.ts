/**
 * Dependency-free replacement for date-fns' format(date, "MMM dd, yyyy").
 * date-fns is declared in package.json but wasn't resolving in the build
 * environment (persisted through a clean node_modules reinstall) — rather
 * than debug a package-manager/registry issue further, this removes the
 * dependency for the one format string actually used across the codebase.
 */
export function formatShortDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
