import { z } from "zod";
import { config } from "./config.js";

export const selectorSchema = z
  .object({
    item: z.string().trim().optional().default(""),
    title: z.string().trim().optional().default(""),
    link: z.string().trim().optional().default(""),
    summary: z.string().trim().optional().default(""),
    date: z.string().trim().optional().default(""),
    image: z.string().trim().optional().default("")
  })
  .default({});

export const customFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "Use letters, numbers, dashes, or underscores; start with a letter."),
  mode: z.enum(["selector", "static"]).optional().default("selector"),
  selector: z.string().trim().optional().default(""),
  value: z.string().trim().max(1000).optional().default(""),
  attr: z.enum(["text", "html", "href", "src", "datetime", "content"]).optional().default("text")
}).superRefine((field, ctx) => {
  if (field.mode === "selector" && !field.selector) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pick a page field or enter a selector.",
      path: ["selector"]
    });
  }

  if (field.mode === "static" && !field.value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Enter a value for this custom field.",
      path: ["value"]
    });
  }
});

export const browserOptionsSchema = z
  .object({
    waitForSelector: z.string().trim().optional().default(""),
    waitMs: z.coerce.number().int().min(0).max(10000).optional().default(0),
    userAgent: z.string().trim().optional().default("")
  })
  .default({});

export const feedMetadataSchema = z
  .object({
    title: z.string().trim().optional().default(""),
    description: z.string().trim().optional().default(""),
    language: z.string().trim().optional().default("en"),
    author: z.string().trim().optional().default(""),
    image: z.string().trim().optional().default(""),
    copyright: z.string().trim().optional().default("")
  })
  .default({});

export const sourceConfigSchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().optional().default(""),
  mode: z.enum(["auto", "static", "browser"]).optional().default("auto"),
  maxItems: z.coerce.number().int().min(1).max(config.maxItems).optional().default(25),
  cacheMinutes: z.coerce.number().int().min(0).max(1440).optional().default(30),
  includePatterns: z.array(z.string().trim()).optional().default([]),
  excludePatterns: z.array(z.string().trim()).optional().default([]),
  preferExistingFeeds: z.coerce.boolean().optional().default(false),
  selectors: selectorSchema,
  customFields: z.array(customFieldSchema).max(20).optional().default([]),
  browser: browserOptionsSchema,
  feed: feedMetadataSchema
});

export const feedRecipeSchema = sourceConfigSchema.extend({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type SelectorConfig = z.infer<typeof selectorSchema>;
export type CustomFieldConfig = z.infer<typeof customFieldSchema>;
export type BrowserOptions = z.infer<typeof browserOptionsSchema>;
export type FeedMetadata = z.infer<typeof feedMetadataSchema>;
export type SourceConfig = z.infer<typeof sourceConfigSchema>;
export type FeedRecipe = z.infer<typeof feedRecipeSchema>;
export type FetchMode = SourceConfig["mode"];

export type ExistingFeedLink = {
  title: string;
  url: string;
  type: string;
};

export type ExtractedItem = {
  title: string;
  link: string;
  summary?: string;
  date?: string;
  image?: string;
  author?: string;
  custom?: Record<string, string>;
  guid?: string;
  score?: number;
};

export type ExtractionIssue = {
  code: string;
  message: string;
};

export type ExtractionResult = {
  sourceUrl: string;
  finalUrl: string;
  title: string;
  description: string;
  strategy: "static" | "browser";
  status?: number;
  blocked: boolean;
  existingFeeds: ExistingFeedLink[];
  items: ExtractedItem[];
  issues: ExtractionIssue[];
  fetchedAt: string;
};

export type StoredFeedsFile = {
  version: 1;
  feeds: FeedRecipe[];
};
