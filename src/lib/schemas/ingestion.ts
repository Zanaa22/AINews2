import { z } from "zod";

import {
  CONFIDENCE_LEVELS,
  HEAT_LEVELS,
  SOURCE_TYPES,
  STREAM_KEYS,
  TRACK_DEFINITIONS,
} from "@/types/domain";

const trackKeys = TRACK_DEFINITIONS.map((track) => track.key) as [
  (typeof TRACK_DEFINITIONS)[number]["key"],
  ...(typeof TRACK_DEFINITIONS)[number]["key"][],
];

export const sourceCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(SOURCE_TYPES),
  identifier: z.string().trim().min(2).max(300),
  providerLabel: z.string().trim().min(2).max(120),
  tier: z.coerce.number().int().min(1).max(3),
  enabled: z.coerce.boolean().default(true),
});

export const sourceToggleSchema = z.object({
  enabled: z.boolean(),
});

export const rawSignalSchema = z.object({
  sourceId: z.string().uuid(),
  sourceUrl: z.string().url(),
  sourceDomain: z.string().min(2).max(120),
  title: z.string().trim().min(6).max(220),
  snippet: z.string().trim().min(10).max(1_000),
  publishedAt: z.date(),
  providerLabel: z.string().trim().min(2).max(120),
  providerKey: z.string().trim().min(2).max(120),
  tier: z.number().int().min(1).max(3),
});

export const classifiedSignalSchema = z.object({
  title: z.string().trim().min(6).max(220),
  summary: z.string().trim().min(20).max(240),
  rationale: z
    .string()
    .trim()
    .min(20)
    .max(420)
    .refine((value) => {
      const parts = value
        .split(/[.!?]/)
        .map((part) => part.trim())
        .filter(Boolean);
      return parts.length <= 3;
    }, "Rationale must be 3 sentences or fewer."),
  heat: z.enum(HEAT_LEVELS),
  trackKey: z.enum(trackKeys),
  trackLabel: z.string().trim().min(3).max(80),
  streamKey: z.enum(STREAM_KEYS),
  streamLabel: z.string().trim().min(3).max(80),
  confidence: z.enum(CONFIDENCE_LEVELS),
  tier: z.number().int().min(1).max(3),
  citations: z.array(z.string().url()).min(1).max(8),
});

export const ingestionArgsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  triggeredBy: z.string().trim().min(2).max(100).default("manual"),
  maxItems: z.number().int().positive().max(250).optional(),
});

export const runNowBodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  adminSecret: z.string().optional(),
});

export type SourceCreateInput = z.infer<typeof sourceCreateSchema>;
export type ClassifiedSignal = z.infer<typeof classifiedSignalSchema>;
export type RawSignalItem = z.infer<typeof rawSignalSchema>;
