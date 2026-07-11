import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ExtractionCache } from "../cache";
import { config } from "../config";
import { FeedHealthStore, type FeedHealth } from "../health";
import { StorageUnavailableError } from "../redis";
import { assertSafeTargetUrl, UnsafeTargetError } from "../security";
import { FeedStore } from "../storage";
import type { FeedRecipe, SourceConfig } from "../types";

let store: FeedStore | undefined;
let healthStore: FeedHealthStore | undefined;
let cache: ExtractionCache | undefined;

export function getStore() {
  store ??= new FeedStore();
  return store;
}

export function getHealthStore() {
  healthStore ??= new FeedHealthStore();
  return healthStore;
}

export function getCache() {
  cache ??= new ExtractionCache();
  return cache;
}

async function extractFeedItemsLazy(source: SourceConfig) {
  const extractor = await import("../extraction/extractor");
  return extractor.extractFeedItems(source);
}

export async function extractWithCache(source: SourceConfig) {
  await assertSafeTargetUrl(source.url);
  const extractionCache = getCache();
  const cached = extractionCache.get(source);
  if (cached) return cached;
  const result = await extractFeedItemsLazy(source);
  extractionCache.set(source, result);
  return result;
}

export async function runFeedHealthCheck(feed: FeedRecipe): Promise<FeedHealth> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await extractFeedItemsLazy(feed);
    const entry: FeedHealth = {
      id: feed.id,
      status: result.items.length > 0 && !result.blocked ? "ok" : "warning",
      checkedAt,
      itemCount: result.items.length,
      strategy: result.strategy,
      statusCode: result.status,
      finalUrl: result.finalUrl,
      issues: result.issues.map((issue) => issue.message)
    };
    return getHealthStore().set(entry);
  } catch (error) {
    return getHealthStore().set({
      id: feed.id,
      status: "error",
      checkedAt,
      itemCount: 0,
      issues: [],
      error: error instanceof Error ? error.message : "Unexpected feed test error."
    });
  }
}

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();

export function rateLimit(request: NextRequest): NextResponse | null {
  if (config.rateLimitMax <= 0) return null;
  const now = Date.now();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwardedFor || request.headers.get("x-real-ip") || "local";
  const existing = rateBuckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + config.rateLimitWindowMs };
  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count <= config.rateLimitMax) return null;

  const response = NextResponse.json({ error: "Too many requests. Slow down and try again." }, { status: 429 });
  response.headers.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
  return response;
}

export function handleError(error: unknown) {
  if (error instanceof UnsafeTargetError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof StorageUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Invalid feed configuration.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  console.error(error);
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Unexpected server error."
    },
    { status: 500 }
  );
}

export function absoluteRequestUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, request.url).toString();
}

export function adHocFeedUrl(request: NextRequest, source: SourceConfig): string {
  const params = new URLSearchParams({
    url: source.url,
    mode: source.mode,
    maxItems: String(source.maxItems),
    cacheMinutes: String(source.cacheMinutes)
  });

  if (source.name) params.set("name", source.name);
  if (source.preferExistingFeeds) params.set("preferExistingFeeds", "true");
  if (source.includePatterns.length > 0) params.set("include", source.includePatterns.join(","));
  if (source.excludePatterns.length > 0) params.set("exclude", source.excludePatterns.join(","));
  if (source.customFields.length > 0) params.set("customFields", JSON.stringify(source.customFields));

  const selectorParams: Array<[string, string]> = [
    ["itemSelector", source.selectors.item],
    ["titleSelector", source.selectors.title],
    ["linkSelector", source.selectors.link],
    ["summarySelector", source.selectors.summary],
    ["dateSelector", source.selectors.date],
    ["imageSelector", source.selectors.image],
    ["waitForSelector", source.browser.waitForSelector],
    ["waitMs", String(source.browser.waitMs || "")],
    ["userAgent", source.browser.userAgent],
    ["feedTitle", source.feed.title],
    ["feedDescription", source.feed.description],
    ["language", source.feed.language],
    ["author", source.feed.author],
    ["feedImage", source.feed.image],
    ["copyright", source.feed.copyright]
  ];

  for (const [key, value] of selectorParams) {
    if (value) params.set(key, value);
  }

  return absoluteRequestUrl(request, `/feed.xml?${params.toString()}`);
}

export function rssResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
