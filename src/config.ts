import path from "node:path";

function booleanEnv(name: string, fallback = false): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "127.0.0.1",
  dataDir: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), "data"),
  defaultUserAgent:
    process.env.DEFAULT_USER_AGENT ??
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 18000),
  browserTimeoutMs: Number(process.env.BROWSER_TIMEOUT_MS ?? 30000),
  maxItems: Number(process.env.MAX_ITEMS ?? 100),
  allowPrivateNetworkTargets: booleanEnv("ALLOW_PRIVATE_NETWORK_TARGETS"),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || "",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 120)
};
