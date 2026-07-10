import type { Request } from "express";
import { sourceConfigSchema, type SourceConfig } from "./types.js";
import { splitPatternList } from "./utils.js";

function first(value: unknown): string | undefined {
  if (Array.isArray(value)) return first(value[0]);
  return typeof value === "string" ? value : undefined;
}

function booleanFromQuery(value: unknown): boolean | undefined {
  const raw = first(value)?.toLowerCase();
  if (!raw) return undefined;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return undefined;
}

function customFieldsFromQuery(value: unknown): unknown[] {
  const raw = first(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function sourceConfigFromQuery(query: Request["query"]): SourceConfig {
  const payload = {
    url: first(query.url),
    name: first(query.name),
    mode: first(query.mode),
    maxItems: first(query.maxItems),
    cacheMinutes: first(query.cacheMinutes),
    preferExistingFeeds: booleanFromQuery(query.preferExistingFeeds),
    includePatterns: splitPatternList(query.include),
    excludePatterns: splitPatternList(query.exclude),
    customFields: customFieldsFromQuery(query.customFields),
    selectors: {
      item: first(query.itemSelector),
      title: first(query.titleSelector),
      link: first(query.linkSelector),
      summary: first(query.summarySelector),
      date: first(query.dateSelector),
      image: first(query.imageSelector)
    },
    browser: {
      waitForSelector: first(query.waitForSelector),
      waitMs: first(query.waitMs),
      userAgent: first(query.userAgent)
    },
    feed: {
      title: first(query.feedTitle),
      description: first(query.feedDescription),
      language: first(query.language),
      author: first(query.author),
      image: first(query.feedImage),
      copyright: first(query.copyright)
    }
  };

  return sourceConfigSchema.parse(payload);
}
