import { useCallback, useRef } from "react";

/**
 * Returns a function that opens a modal (Dialog/AlertDialog) via the given
 * setter, deferred until after the current DropdownMenu has fully closed
 * and torn down its own focus-trap/portal.
 *
 * Why this exists: calling a Dialog/AlertDialog's open-setter synchronously
 * inside a DropdownMenuItem's onSelect — even with onSelect's
 * preventDefault() called — can still race Radix's own dropdown unmount.
 * Radix's DropdownMenuContent renders in a portal with its own focus
 * scope; if a new focus-trap (the Dialog) mounts before that portal has
 * actually unmounted, the dropdown's content can be left aria-hidden by
 * the new dialog while still holding DOM focus, which blocks all pointer
 * interaction on the page until a hard refresh. Deferring the open to the
 * next macrotask (setTimeout 0) lets the dropdown's own close/unmount
 * effects finish first, so there's never a moment with two competing
 * focus-traps mounted at once.
 *
 * Usage:
 *   const openMarkPaid = useDeferredModalOpen(setIsMarkPaidOpen);
 *   <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openMarkPaid(); }}>
 */
export function useDeferredModalOpen(setOpen: (open: boolean) => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, 0);
  }, [setOpen]);
}
