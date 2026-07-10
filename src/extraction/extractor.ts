import type { ExtractionIssue, ExtractionResult, SourceConfig } from "../types.js";
import { fetchBrowserDocument } from "./browser-fetch.js";
import { parseDocument } from "./parser.js";
import { fetchStaticDocument } from "./static-fetch.js";

export async function extractFeedItems(source: SourceConfig): Promise<ExtractionResult> {
  if (source.mode === "browser") {
    return parseDocument(await fetchBrowserDocument(source.url, source.browser), source);
  }

  let staticResult: ExtractionResult | undefined;
  let staticError: Error | undefined;

  try {
    staticResult = parseDocument(await fetchStaticDocument(source.url, source.browser), source);
  } catch (error) {
    staticError = error as Error;
  }

  if (source.mode === "static") {
    if (staticResult) return staticResult;
    throw staticError;
  }

  const shouldTryBrowser =
    !staticResult ||
    staticResult.blocked ||
    staticResult.items.length === 0 ||
    staticResult.items.length < Math.min(3, source.maxItems);

  if (!shouldTryBrowser && staticResult) {
    return staticResult;
  }

  try {
    const browserResult = parseDocument(await fetchBrowserDocument(source.url, source.browser), source);
    const mergedIssues: ExtractionIssue[] = staticResult
      ? [
          ...browserResult.issues,
          ...staticResult.issues
            .filter((issue) => issue.code !== "no_items")
            .map((issue) => ({
              ...issue,
              message: `Static attempt: ${issue.message}`
            }))
        ]
      : browserResult.issues;

    return {
      ...browserResult,
      issues: mergedIssues
    };
  } catch (error) {
    if (!staticResult) throw error;
    return {
      ...staticResult,
      issues: [
        ...staticResult.issues,
        {
          code: "browser_failed",
          message: `Browser attempt failed: ${(error as Error).message}`
        }
      ]
    };
  }
}
