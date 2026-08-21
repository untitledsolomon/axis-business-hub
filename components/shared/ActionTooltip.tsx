"use client";

import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionTooltipProps {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Wraps any trigger (usually an icon button, or another Radix trigger like
 * DialogTrigger/DropdownMenuTrigger) with a short hover description, e.g.
 * <ActionTooltip label="Send invoice to client"><Button>...</Button></ActionTooltip>.
 *
 * When wrapping a plain element (Button, icon, etc.) this is a normal
 * asChild merge — fine. When wrapping ANOTHER Radix trigger
 * (DialogTrigger/DropdownMenuTrigger), put ActionTooltip on the outside and
 * do NOT also put asChild on the inner trigger's Button child — let the
 * inner trigger render its own default element. Stacking `asChild` on two
 * nested Radix triggers pointed at the same DOM node causes only one
 * layer's Slot merge to actually attach — the other layer's event handlers
 * (often the outer one, e.g. onClick to open a dialog) get silently
 * dropped. That produces a button that looks correct in the DOM but never
 * responds to clicks, with no console error. See InvoicesList.tsx and
 * InvoiceActions.tsx for the corrected usage pattern.
 */
export function ActionTooltip({ label, children, side = "top" }: ActionTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
