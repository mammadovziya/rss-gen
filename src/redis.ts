import { Redis } from "@upstash/redis";
import { config } from "./config";

let redis: Redis | null | undefined;

export class StorageUnavailableError extends Error {
  constructor() {
    super("Saved feeds need Upstash Redis on Vercel. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel environment variables, then redeploy.");
    this.name = "StorageUnavailableError";
  }
}

export function getRedis(): Redis | null {
  if (!config.upstashRedisUrl || !config.upstashRedisToken) return null;

  redis ??= new Redis({
    url: config.upstashRedisUrl,
    token: config.upstashRedisToken
  });

  return redis;
}

export function storageKey(name: string): string {
  return `${config.storagePrefix}:${name}`;
}

export function storageBackendName(): string {
  return getRedis() ? "Upstash Redis" : "local data directory";
}

export function assertWritableStorage(): void {
  if (config.isVercel && !getRedis()) {
    throw new StorageUnavailableError();
  }
}
