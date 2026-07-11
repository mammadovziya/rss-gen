import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import slugify from "slugify";
import { config } from "./config";
import { getRedis, storageKey } from "./redis";
import { feedRecipeSchema, sourceConfigSchema, type FeedRecipe, type SourceConfig, type StoredFeedsFile } from "./types";

const STORE_FILE = "feeds.json";
const REDIS_STORE_KEY = storageKey("feeds");

export class FeedStore {
  private readonly filePath: string;

  constructor(private readonly dataDir = config.dataDir) {
    this.filePath = path.join(dataDir, STORE_FILE);
  }

  async list(): Promise<FeedRecipe[]> {
    const store = await this.read();
    return store.feeds.sort((a, b) => a.name.localeCompare(b.name) || a.url.localeCompare(b.url));
  }

  async get(id: string): Promise<FeedRecipe | undefined> {
    const store = await this.read();
    return store.feeds.find((feed) => feed.id === id);
  }

  async export(): Promise<StoredFeedsFile> {
    return this.read();
  }

  async import(feeds: unknown[], mode: "merge" | "replace" = "merge"): Promise<FeedRecipe[]> {
    const store = mode === "merge" ? await this.read() : { version: 1 as const, feeds: [] };
    const now = new Date().toISOString();
    const nextFeeds = [...store.feeds];

    for (const rawFeed of feeds) {
      const parsedRecipe = feedRecipeSchema.safeParse(rawFeed);
      const source = sourceConfigSchema.parse(parsedRecipe.success ? parsedRecipe.data : rawFeed);
      const importedId = parsedRecipe.success ? parsedRecipe.data.id : "";
      const importedCreatedAt = parsedRecipe.success ? parsedRecipe.data.createdAt : "";
      const existingIndex = importedId ? nextFeeds.findIndex((feed) => feed.id === importedId) : -1;
      const id = importedId ? this.uniqueId(importedId, nextFeeds, existingIndex) : this.makeId(source, nextFeeds);
      const recipe = feedRecipeSchema.parse({
        ...source,
        id,
        createdAt: importedCreatedAt || now,
        updatedAt: now
      });

      if (existingIndex >= 0) {
        nextFeeds[existingIndex] = recipe;
      } else {
        nextFeeds.push(recipe);
      }
    }

    await this.write({ version: 1, feeds: nextFeeds });
    return nextFeeds;
  }

  async save(source: SourceConfig, id?: string): Promise<FeedRecipe> {
    const store = await this.read();
    const now = new Date().toISOString();
    const existing = id ? store.feeds.find((feed) => feed.id === id) : undefined;
    const recipe: FeedRecipe = feedRecipeSchema.parse({
      ...source,
      id: existing?.id ?? this.makeId(source, store.feeds),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    });

    const nextFeeds = existing
      ? store.feeds.map((feed) => (feed.id === existing.id ? recipe : feed))
      : [...store.feeds, recipe];

    await this.write({ version: 1, feeds: nextFeeds });
    return recipe;
  }

  async delete(id: string): Promise<boolean> {
    const store = await this.read();
    const nextFeeds = store.feeds.filter((feed) => feed.id !== id);
    if (nextFeeds.length === store.feeds.length) return false;
    await this.write({ version: 1, feeds: nextFeeds });
    return true;
  }

  private async read(): Promise<StoredFeedsFile> {
    const redis = getRedis();
    if (redis) {
      const rawStore = await redis.get<unknown>(REDIS_STORE_KEY);
      if (!rawStore) return { version: 1, feeds: [] };
      const parsed = typeof rawStore === "string" ? JSON.parse(rawStore) : rawStore;
      return parseStoredFeeds(parsed);
    }

    await fs.mkdir(this.dataDir, { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return parseStoredFeeds(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 1, feeds: [] };
      }
      throw error;
    }
  }

  private async write(store: StoredFeedsFile): Promise<void> {
    const redis = getRedis();
    if (redis) {
      await redis.set(REDIS_STORE_KEY, store);
      return;
    }

    await fs.mkdir(this.dataDir, { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await fs.rename(tempPath, this.filePath);
  }

  private makeId(source: SourceConfig, feeds: FeedRecipe[]): string {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    const seed = source.name || source.feed.title || host;
    const base = slugify(seed, { lower: true, strict: true }) || "feed";
    let id = `${base}-${crypto.randomUUID().slice(0, 8)}`;

    while (feeds.some((feed) => feed.id === id)) {
      id = `${base}-${crypto.randomUUID().slice(0, 8)}`;
    }

    return id;
  }

  private uniqueId(id: string, feeds: FeedRecipe[], existingIndex: number): string {
    if (!feeds.some((feed, index) => feed.id === id && index !== existingIndex)) return id;

    let nextId = `${id}-${crypto.randomUUID().slice(0, 8)}`;
    while (feeds.some((feed) => feed.id === nextId)) {
      nextId = `${id}-${crypto.randomUUID().slice(0, 8)}`;
    }
    return nextId;
  }
}

function parseStoredFeeds(raw: unknown): StoredFeedsFile {
  const store = raw as StoredFeedsFile;
  return {
    version: 1,
    feeds: Array.isArray(store?.feeds) ? store.feeds.map((feed) => feedRecipeSchema.parse(feed)) : []
  };
}
