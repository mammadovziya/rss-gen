import crypto from "node:crypto";
import type { SourceConfig } from "./types.js";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid"
];

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function truncateText(value: string | undefined, max = 500): string | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

export function absoluteUrl(value: string | null | undefined, baseUrl: string): string | undefined {
  const raw = normalizeText(value);
  if (!raw || raw.startsWith("data:") || raw.startsWith("javascript:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return undefined;
  }

  try {
    const url = new URL(raw, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function canonicalItemUrl(value: string, baseUrl?: string): string {
  const url = new URL(value, baseUrl);
  url.hash = "";

  for (const param of TRACKING_PARAMS) {
    url.searchParams.delete(param);
  }

  const sortedParams = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [key, val] of sortedParams) {
    url.searchParams.append(key, val);
  }

  return url.toString().replace(/\/$/, "");
}

export function sameRegistrableHost(a: string, b: string): boolean {
  const hostA = new URL(a).hostname.replace(/^www\./, "");
  const hostB = new URL(b).hostname.replace(/^www\./, "");
  return hostA === hostB || hostA.endsWith(`.${hostB}`) || hostB.endsWith(`.${hostA}`);
}

export function isLikelyAssetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return /\.(?:7z|avi|css|docx?|eot|exe|gif|ico|jpe?g|js|json|m4v|mov|mp3|mp4|mpeg|pdf|png|rar|svg|ttf|webm|webp|woff2?|xlsx?|zip)$/i.test(
      url.pathname
    );
  } catch {
    return true;
  }
}

export function splitPatternList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(splitPatternList);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function matchesAnyPattern(haystack: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const text = haystack.toLowerCase();

  return patterns.some((pattern) => {
    const trimmed = pattern.trim();
    if (!trimmed) return false;

    if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
      const lastSlash = trimmed.lastIndexOf("/");
      const body = trimmed.slice(1, lastSlash);
      const flags = trimmed.slice(lastSlash + 1) || "i";
      try {
        return new RegExp(body, flags).test(haystack);
      } catch {
        return text.includes(trimmed.toLowerCase());
      }
    }

    return text.includes(trimmed.toLowerCase());
  });
}

export function filterItemByPatterns(
  item: { title: string; link: string; summary?: string },
  source: Pick<SourceConfig, "includePatterns" | "excludePatterns">
): boolean {
  const haystack = `${item.title}\n${item.link}\n${item.summary ?? ""}`;
  if (source.includePatterns.length > 0 && !matchesAnyPattern(haystack, source.includePatterns)) {
    return false;
  }
  return !matchesAnyPattern(haystack, source.excludePatterns);
}

export function stableHash(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function cleanObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, val]) => {
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== null && val !== "";
    })
  ) as T;
}

export function toDateString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
