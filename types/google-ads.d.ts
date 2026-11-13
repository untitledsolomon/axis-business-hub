// Global declaration for the Google Ads conversion tag (AW-656595205) loaded
// in the root layout (app/layout.tsx). Event callbacks fire `gtag('event', ...)`
// conversions through this function.
export {};

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}
