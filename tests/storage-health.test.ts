import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FeedHealthStore } from "../src/health.js";
import { FeedStore } from "../src/storage.js";
import { sourceConfigSchema } from "../src/types.js";

let tempDir = "";

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rss-generator-test-"));
});

afterEach(async () => {
  if (tempDir) await fs.rm(tempDir, { force: true, recursive: true });
});

describe("FeedStore import/export", () => {
  it("exports and re-imports saved feeds with stable ids", async () => {
    const store = new FeedStore(tempDir);
    const feed = await store.save(
      sourceConfigSchema.parse({
        url: "https://example.com/news",
        name: "Example News"
      })
    );

    const backup = await store.export();
    const imported = await store.import(backup.feeds, "replace");

    expect(imported).toHaveLength(1);
    expect(imported[0].id).toBe(feed.id);
    expect(imported[0].url).toBe("https://example.com/news");
  });
});

describe("FeedHealthStore", () => {
  it("stores, deletes, and prunes feed health entries", async () => {
    const store = new FeedHealthStore(tempDir);
    await store.set({
      id: "feed-a",
      status: "ok",
      checkedAt: new Date().toISOString(),
      itemCount: 3,
      strategy: "static",
      statusCode: 200,
      issues: []
    });
    await store.set({
      id: "feed-b",
      status: "error",
      checkedAt: new Date().toISOString(),
      itemCount: 0,
      issues: [],
      error: "Failed"
    });

    expect((await store.get("feed-a")).status).toBe("ok");
    await store.prune(["feed-a"]);
    expect(Object.keys(await store.list())).toEqual(["feed-a"]);
    await store.delete("feed-a");
    expect(await store.list()).toEqual({});
  });
});
