import { renderClassicTemplate } from "./classic";
import { renderModernTemplate } from "./modern";
import { renderMinimalTemplate } from "./minimal";

export const BUILT_IN_TEMPLATES = {
  classic: { name: "Classic", render: renderClassicTemplate },
  modern: { name: "Modern", render: renderModernTemplate },
  minimal: { name: "Minimal", render: renderMinimalTemplate },
} as const;

export type BuiltInTemplateId = keyof typeof BUILT_IN_TEMPLATES;
