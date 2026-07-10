import type { ExtractionResult, SourceConfig } from "./types";
import { stableHash } from "./utils";

type CacheEntry = {
  expiresAt: number;
  result: ExtractionResult;
};

export class ExtractionCache {
  private readonly entries = new Map<string, CacheEntry>();

  get(source: SourceConfig): ExtractionResult | undefined {
    if (source.cacheMinutes <= 0) return undefined;
    const key = this.key(source);
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.result;
  }

  set(source: SourceConfig, result: ExtractionResult): void {
    if (source.cacheMinutes <= 0) return;
    this.entries.set(this.key(source), {
      expiresAt: Date.now() + source.cacheMinutes * 60_000,
      result
    });
  }

  delete(source: SourceConfig): void {
    this.entries.delete(this.key(source));
  }

  clear(): void {
    this.entries.clear();
  }

  private key(source: SourceConfig): string {
    return stableHash({
      ...source,
      cacheMinutes: undefined
    });
  }
}
