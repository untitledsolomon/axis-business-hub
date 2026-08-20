"use client";

import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionTooltipProps {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Wraps any trigger (usually an icon button) with a short hover description,
 * e.g. <ActionTooltip label="Send invoice to client"><Button>...</Button></ActionTooltip>.
 * Uses the existing Radix Tooltip primitives — TooltipProvider is already
 * mounted once in app/layout.tsx, so this is safe to use anywhere without
 * extra setup.
 */
export function ActionTooltip({ label, children, side = "top" }: ActionTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
