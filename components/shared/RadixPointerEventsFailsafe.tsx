"use client";

import { useEffect } from "react";

/**
 * Failsafe for a long-standing Radix bug (radix-ui/primitives#1241, #3317,
 * #3445, #3645, and others): when a Dialog/AlertDialog opens from inside a
 * DropdownMenuItem's onSelect, two DismissableLayers can end up racing each
 * other's mount/unmount, occasionally leaving `pointer-events: none` stuck
 * on <body> after everything has actually closed — the whole app becomes
 * unclickable until a hard refresh.
 *
 * We already avoid triggering this in our own code (see
 * use-deferred-modal-open.ts, used throughout InvoiceActions,
 * JournalEntryActions, etc.) and stay current on @radix-ui/react-dialog /
 * react-dropdown-menu, since upstream has shipped real fixes for several
 * variants of this. But the bug has resurfaced across multiple Radix
 * versions over time (see the open/reopened issues above), so this is a
 * belt-and-suspenders net: if body ever ends up with pointer-events: none
 * while no Radix overlay is actually present in the DOM, clear it.
 *
 * This does NOT interfere with legitimate modal states — it only acts when
 * pointer-events is none AND there is no open Dialog/AlertDialog/Dropdown/
 * Popover/Select/etc. content currently mounted, which is exactly the
 * "stuck" condition and never a valid open-modal state.
 */
const RADIX_OPEN_CONTENT_SELECTOR = [
  '[data-radix-dialog-content]',
  '[data-radix-alert-dialog-content]',
  '[data-radix-popper-content-wrapper]',
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="dropdown-menu-sub-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="select-content"]',
  '[data-slot="context-menu-content"]',
  '[data-slot="hover-card-content"]',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(",");

function clearStuckPointerEvents() {
  if (document.body.style.pointerEvents !== "none") return;
  const hasOpenRadixLayer = document.querySelector(RADIX_OPEN_CONTENT_SELECTOR) !== null;
  if (!hasOpenRadixLayer) {
    document.body.style.pointerEvents = "";
  }
}

export function RadixPointerEventsFailsafe() {
  useEffect(() => {
    // Catches the common case: check shortly after every click, since
    // that's when a dropdown->dialog transition (the usual trigger) fires.
    const onClick = () => {
      // Two checks: right after the click's own synchronous handlers run,
      // and again after Radix's close/open animations and effects settle.
      setTimeout(clearStuckPointerEvents, 0);
      setTimeout(clearStuckPointerEvents, 350);
    };
    document.addEventListener("click", onClick, true);

    // Belt-and-suspenders: a low-frequency sweep in case the stuck state
    // arises from something other than a click (e.g. Escape key, a
    // programmatic close triggered by a mutation completing).
    const interval = setInterval(clearStuckPointerEvents, 1000);

    return () => {
      document.removeEventListener("click", onClick, true);
      clearInterval(interval);
    };
  }, []);

  return null;
}
