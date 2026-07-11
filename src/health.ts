import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { config } from "./config";
import { assertWritableStorage, getRedis, storageKey } from "./redis";

const HEALTH_FILE = "feed-health.json";
const REDIS_HEALTH_KEY = storageKey("feed-health");

export const feedHealthSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["unknown", "ok", "warning", "error"]),
  checkedAt: z.string().datetime().optional(),
  itemCount: z.number().int().min(0).optional(),
  strategy: z.enum(["static", "browser"]).optional(),
  statusCode: z.number().int().optional(),
  finalUrl: z.string().optional(),
  issues: z.array(z.string()).default([]),
  error: z.string().optional()
});

const feedHealthFileSchema = z.object({
  version: z.literal(1),
  entries: z.record(feedHealthSchema)
});

export type FeedHealth = z.infer<typeof feedHealthSchema>;

type FeedHealthFile = z.infer<typeof feedHealthFileSchema>;

export class FeedHealthStore {
  private readonly filePath: string;

  constructor(private readonly dataDir = config.dataDir) {
    this.filePath = path.join(dataDir, HEALTH_FILE);
  }

  async list(): Promise<Record<string, FeedHealth>> {
    return (await this.read()).entries;
  }

  async get(id: string): Promise<FeedHealth> {
    const store = await this.read();
    return store.entries[id] ?? { id, status: "unknown", issues: [] };
  }

  async set(entry: FeedHealth): Promise<FeedHealth> {
    const store = await this.read();
    const parsed = feedHealthSchema.parse(entry);
    await this.write({ version: 1, entries: { ...store.entries, [parsed.id]: parsed } });
    return parsed;
  }

  async delete(id: string): Promise<void> {
    const store = await this.read();
    if (!store.entries[id]) return;
    const nextEntries = { ...store.entries };
    delete nextEntries[id];
    await this.write({ version: 1, entries: nextEntries });
  }

  async prune(validIds: string[]): Promise<void> {
    const valid = new Set(validIds);
    const store = await this.read();
    const nextEntries = Object.fromEntries(Object.entries(store.entries).filter(([id]) => valid.has(id)));
    await this.write({ version: 1, entries: nextEntries });
  }

  private async read(): Promise<FeedHealthFile> {
    const redis = getRedis();
    if (redis) {
      const rawStore = await redis.get<unknown>(REDIS_HEALTH_KEY);
      if (!rawStore) return { version: 1, entries: {} };
      const parsed = typeof rawStore === "string" ? JSON.parse(rawStore) : rawStore;
      return feedHealthFileSchema.parse(parsed);
    }

    if (config.isVercel) return { version: 1, entries: {} };

    await fs.mkdir(this.dataDir, { recursive: true });
    try {
      return feedHealthFileSchema.parse(JSON.parse(await fs.readFile(this.filePath, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { version: 1, entries: {} };
      }
      throw error;
    }
  }

  private async write(store: FeedHealthFile): Promise<void> {
    const redis = getRedis();
    if (redis) {
      await redis.set(REDIS_HEALTH_KEY, store);
      return;
    }

    assertWritableStorage();

    await fs.mkdir(this.dataDir, { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await fs.rename(tempPath, this.filePath);
  }
}
