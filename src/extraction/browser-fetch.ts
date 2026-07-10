import { chromium, type Browser } from "playwright";
import { config } from "../config.js";
import { assertSafeTargetUrl } from "../security.js";
import type { BrowserOptions } from "../types.js";
import type { FetchedDocument } from "./static-fetch.js";

let browser: Browser | undefined;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });
  }
  return browser;
}

export async function fetchBrowserDocument(url: string, options: BrowserOptions): Promise<FetchedDocument> {
  await assertSafeTargetUrl(url);
  const activeBrowser = await getBrowser();
  const page = await activeBrowser.newPage({
    userAgent: options.userAgent || config.defaultUserAgent,
    viewport: { width: 1440, height: 1100 },
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9"
    }
  });

  try {
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      if (!/^https?:/i.test(requestUrl)) {
        await route.continue();
        return;
      }

      try {
        await assertSafeTargetUrl(requestUrl);
        await route.continue();
      } catch {
        await route.abort();
      }
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.browserTimeoutMs
    });

    try {
      await page.waitForLoadState("networkidle", { timeout: 8000 });
    } catch {
      // Many modern sites keep sockets open. DOM content is enough for extraction.
    }

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: Math.min(config.browserTimeoutMs, 12000) });
    }

    if (options.waitMs > 0) {
      await page.waitForTimeout(options.waitMs);
    }

    return {
      html: await page.content(),
      finalUrl: page.url(),
      status: response?.status(),
      strategy: "browser"
    };
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = undefined;
  }
}
