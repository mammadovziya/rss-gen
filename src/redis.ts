import { Redis } from "@upstash/redis";
import { config } from "./config";

let redis: Redis | null | undefined;

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
