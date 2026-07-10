import { config } from "../config";
import { assertSafeTargetUrl } from "../security";
import type { BrowserOptions } from "../types";

export type FetchedDocument = {
  html: string;
  finalUrl: string;
  status?: number;
  strategy: "static" | "browser";
};

export async function fetchStaticDocument(url: string, browserOptions?: BrowserOptions): Promise<FetchedDocument> {
  let target = (await assertSafeTargetUrl(url)).toString();
  const redirects: string[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  timeout.unref?.();

  try {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      response = await fetch(target, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": browserOptions?.userAgent || config.defaultUserAgent,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache"
        }
      });

      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) break;
      target = (await assertSafeTargetUrl(new URL(location, target).toString())).toString();
      redirects.push(target);
    }

    if (!response) throw new Error("No response received.");
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      throw new Error("Too many redirects while fetching source URL.");
    }

    return {
      html: await response.text(),
      finalUrl: redirects.at(-1) || response.url || target,
      status: response.status,
      strategy: "static"
    };
  } finally {
    clearTimeout(timeout);
  }
}
