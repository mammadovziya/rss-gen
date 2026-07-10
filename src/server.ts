import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ExtractionCache } from "./cache.js";
import { config } from "./config.js";
import { createBuilderSnapshot } from "./extraction/builder-snapshot.js";
import { extractFeedItems } from "./extraction/extractor.js";
import { closeBrowser } from "./extraction/browser-fetch.js";
import { renderRssXml } from "./feed.js";
import { FeedHealthStore, type FeedHealth } from "./health.js";
import { sourceConfigFromQuery } from "./http-input.js";
import { logger } from "./logger.js";
import { assertSafeTargetUrl, privacySummary, UnsafeTargetError } from "./security.js";
import { FeedStore } from "./storage.js";
import { sourceConfigSchema, type FeedRecipe, type SourceConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");
const app = express();
const store = new FeedStore();
const healthStore = new FeedHealthStore();
const cache = new ExtractionCache();

app.use(helmet({ contentSecurityPolicy: false }));
if (config.corsOrigin) {
  app.use(cors({ origin: config.corsOrigin }));
}
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));
app.use(["/api", "/feed.xml", "/rss"], rateLimit);

app.get("/health", (_req, res) => {
  res.json({ ok: true, local: true, time: new Date().toISOString() });
});

app.get("/api/privacy", (_req, res) => {
  res.json({ privacy: privacySummary() });
});

app.get("/api/feeds", async (_req, res, next) => {
  try {
    res.json({ feeds: await store.list() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/feed-health", async (_req, res, next) => {
  try {
    res.json({ health: await healthStore.list() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/feeds/:id", async (req, res, next) => {
  try {
    const feed = await store.get(req.params.id);
    if (!feed) return res.status(404).json({ error: "Feed recipe not found." });
    res.json({ feed });
  } catch (error) {
    next(error);
  }
});

app.post("/api/feeds/:id/test", async (req, res, next) => {
  try {
    const feed = await store.get(req.params.id);
    if (!feed) return res.status(404).json({ error: "Feed recipe not found." });
    cache.delete(feed);
    const entry = await runFeedHealthCheck(feed);
    res.json({ health: entry });
  } catch (error) {
    next(error);
  }
});

app.post("/api/preview", async (req, res, next) => {
  try {
    const source = sourceConfigSchema.parse(req.body);
    const result = await extractWithCache(source);
    res.json({ result, rssUrl: adHocFeedUrl(req, source) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/builder-page", async (req, res, next) => {
  try {
    const source = sourceConfigSchema.parse(req.body);
    const snapshot = await createBuilderSnapshot(source);
    res.json({ snapshot });
  } catch (error) {
    next(error);
  }
});

app.post("/api/feeds", async (req, res, next) => {
  try {
    const source = sourceConfigSchema.parse(req.body);
    const feed = await store.save(source);
    cache.delete(feed);
    await healthStore.delete(feed.id);
    res.status(201).json({ feed, rssUrl: absoluteRequestUrl(req, `/rss/${feed.id}.xml`) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/feeds/:id", async (req, res, next) => {
  try {
    const source = sourceConfigSchema.parse(req.body);
    const existing = await store.get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Feed recipe not found." });
    const feed = await store.save(source, req.params.id);
    cache.delete(feed);
    await healthStore.delete(feed.id);
    res.json({ feed, rssUrl: absoluteRequestUrl(req, `/rss/${feed.id}.xml`) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/feeds/:id", async (req, res, next) => {
  try {
    const deleted = await store.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Feed recipe not found." });
    await healthStore.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/export", async (_req, res, next) => {
  try {
    const backup = await store.export();
    res
      .type("application/json")
      .set("Content-Disposition", `attachment; filename="rss-generator-backup-${new Date().toISOString().slice(0, 10)}.json"`)
      .json({ ...backup, exportedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/import", async (req, res, next) => {
  try {
    const payload = z
      .object({
        feeds: z.array(z.unknown()),
        mode: z.enum(["merge", "replace"]).optional().default("merge")
      })
      .parse(req.body);
    const feeds = await store.import(payload.feeds, payload.mode);
    cache.clear();
    await healthStore.prune(feeds.map((feed) => feed.id));
    res.json({ feeds, imported: payload.feeds.length, mode: payload.mode });
  } catch (error) {
    next(error);
  }
});

app.get("/feed.xml", async (req, res, next) => {
  try {
    const source = sourceConfigFromQuery(req.query);
    const result = await extractWithCache(source);
    res
      .type("application/rss+xml; charset=utf-8")
      .send(renderRssXml(source, result, absoluteRequestUrl(req, req.originalUrl)));
  } catch (error) {
    next(error);
  }
});

app.get("/rss/:id.xml", async (req, res, next) => {
  try {
    const source = await store.get(req.params.id);
    if (!source) return res.status(404).type("text/plain").send("Feed recipe not found.");
    const result = await extractWithCache(source);
    res
      .type("application/rss+xml; charset=utf-8")
      .send(renderRssXml(source, result, absoluteRequestUrl(req, req.originalUrl)));
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof UnsafeTargetError) {
    return res.status(400).json({
      error: error.message
    });
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: "Invalid feed configuration.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  logger.error({ error }, "request failed");
  res.status(500).json({
    error: error instanceof Error ? error.message : "Unexpected server error."
  });
});

async function extractWithCache(source: SourceConfig) {
  await assertSafeTargetUrl(source.url);
  const cached = cache.get(source);
  if (cached) return cached;
  const result = await extractFeedItems(source);
  cache.set(source, result);
  return result;
}

function adHocFeedUrl(req: express.Request, source: SourceConfig): string {
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

  return absoluteRequestUrl(req, `/feed.xml?${params.toString()}`);
}

function absoluteRequestUrl(req: express.Request, pathname: string): string {
  return `${req.protocol}://${req.get("host")}${pathname}`;
}

async function runFeedHealthCheck(feed: FeedRecipe): Promise<FeedHealth> {
  const checkedAt = new Date().toISOString();
  try {
    const result = await extractFeedItems(feed);
    const issues = result.issues.map((issue) => issue.message);
    const entry: FeedHealth = {
      id: feed.id,
      status: result.items.length > 0 && !result.blocked ? "ok" : "warning",
      checkedAt,
      itemCount: result.items.length,
      strategy: result.strategy,
      statusCode: result.status,
      finalUrl: result.finalUrl,
      issues
    };
    return healthStore.set(entry);
  } catch (error) {
    return healthStore.set({
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

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (config.rateLimitMax <= 0) return next();
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "local";
  const existing = rateBuckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + config.rateLimitWindowMs };
  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count > config.rateLimitMax) {
    res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({ error: "Too many requests. Slow down and try again." });
  }

  next();
}

const server = app.listen(config.port, config.host, () => {
  logger.info({ port: config.port, host: config.host, dataDir: config.dataDir, privacy: privacySummary() }, "rss generator running");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close(async () => {
    await closeBrowser();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
