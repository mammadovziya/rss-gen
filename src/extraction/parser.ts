import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import type {
  CustomFieldConfig,
  ExistingFeedLink,
  ExtractedItem,
  ExtractionIssue,
  ExtractionResult,
  SourceConfig
} from "../types";
import {
  absoluteUrl,
  canonicalItemUrl,
  filterItemByPatterns,
  isLikelyAssetUrl,
  normalizeText,
  sameRegistrableHost,
  toDateString,
  truncateText
} from "../utils";
import { detectBlocked } from "./block-detection";
import type { FetchedDocument } from "./static-fetch";

const CONTAINER_SELECTOR = [
  "article",
  "[itemtype*='Article']",
  "[class*='article']",
  "[class*='entry']",
  "[class*='post']",
  "[class*='story']",
  "[class*='news']",
  "[class*='card']",
  "[data-testid*='post']",
  "[data-testid*='article']"
].join(",");

const SKIP_LINK_TEXT = /^(about|account|advertise|all rights reserved|archive|author|categories|category|comment|contact|cookies|follow|home|jobs|legal|login|log in|menu|newsletter|next|older|popular|previous|privacy|profile|read more|register|related|rss|search|share|sign in|sign up|subscribe|tag|tags|terms)$/i;
const SKIP_PATH = /\/(?:account|admin|author|cart|category|comment|contact|login|privacy|search|signin|signup|tag|terms)(?:\/|$)/i;

export function parseDocument(document: FetchedDocument, source: SourceConfig): ExtractionResult {
  const $ = cheerio.load(document.html);
  const baseUrl = document.finalUrl;
  const issues: ExtractionIssue[] = detectBlocked(document.status, document.html);
  const existingFeeds = discoverExistingFeeds($, baseUrl);
  const title = getPageTitle($, baseUrl, source);
  const description = getPageDescription($);

  $("script, style, template, svg, canvas, iframe").remove();

  let items: ExtractedItem[] = [];
  if (source.selectors.item) {
    try {
      items = extractBySelectors($, source, baseUrl);
    } catch (error) {
      issues.push({
        code: "invalid_selector",
        message: `One or more CSS selectors could not be evaluated: ${(error as Error).message}`
      });
    }
  }

  if (items.length === 0) {
    items = extractAutomatically($, source, baseUrl);
  }

  if (items.length === 0) {
    items = extractReadableArticle(document.html, source, baseUrl, $, issues);
  }

  items = prepareItems(items, source);

  if (items.length === 0) {
    issues.push({
      code: "no_items",
      message:
        "No feed items were found. Try browser mode, add item/title/link CSS selectors, or narrow the page to a listing URL."
    });
  }

  return {
    sourceUrl: source.url,
    finalUrl: baseUrl,
    title,
    description,
    strategy: document.strategy,
    status: document.status,
    blocked: issues.some((issue) => issue.code.startsWith("blocked")),
    existingFeeds,
    items,
    issues,
    fetchedAt: new Date().toISOString()
  };
}

function getPageTitle($: cheerio.CheerioAPI, baseUrl: string, source: SourceConfig): string {
  return (
    normalizeText(source.feed.title) ||
    normalizeText(source.name) ||
    normalizeText($("meta[property='og:title']").attr("content")) ||
    normalizeText($("title").first().text()) ||
    new URL(baseUrl).hostname
  );
}

function getPageDescription($: cheerio.CheerioAPI): string {
  return (
    truncateText(
      $("meta[name='description']").attr("content") ||
        $("meta[property='og:description']").attr("content") ||
        $("meta[name='twitter:description']").attr("content"),
      300
    ) ?? ""
  );
}

function discoverExistingFeeds($: cheerio.CheerioAPI, baseUrl: string): ExistingFeedLink[] {
  const feeds = new Map<string, ExistingFeedLink>();

  $("link[rel*='alternate']").each((_, element) => {
    const link = $(element);
    const type = normalizeText(link.attr("type")).toLowerCase();
    const href = absoluteUrl(link.attr("href"), baseUrl);
    if (!href || !/(rss|atom|json|feed|xml)/i.test(type)) return;
    feeds.set(href, {
      title: normalizeText(link.attr("title")) || type || "Feed",
      type,
      url: href
    });
  });

  $("a[href]").each((_, element) => {
    if (feeds.size >= 12) return;
    const link = $(element);
    const href = absoluteUrl(link.attr("href"), baseUrl);
    const text = normalizeText(link.text());
    if (!href) return;
    if (!/(rss|atom|feed|\.xml|\.rss|\.atom|jsonfeed)/i.test(`${href} ${text}`)) return;
    feeds.set(href, {
      title: text || "Feed",
      type: href.endsWith(".json") ? "application/feed+json" : "application/rss+xml",
      url: href
    });
  });

  return [...feeds.values()].slice(0, 12);
}

function extractBySelectors($: cheerio.CheerioAPI, source: SourceConfig, baseUrl: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  $(source.selectors.item).each((index, element) => {
    const scope = $(element);
    const titleNode = firstWithin($, scope, source.selectors.title);
    const linkNode = firstWithin($, scope, source.selectors.link);
    const summaryNode = firstWithin($, scope, source.selectors.summary);
    const dateNode = firstWithin($, scope, source.selectors.date);
    const imageNode = firstWithin($, scope, source.selectors.image);

    const link = extractLink($, scope, linkNode, baseUrl);
    const title =
      normalizeText(titleNode.text()) ||
      normalizeText(linkNode.text()) ||
      normalizeText(scope.find("h1,h2,h3,a").first().text());

    if (!title || !link) return;
    items.push({
      title,
      link,
      summary: truncateText(summaryNode.text() || scope.find("p").first().text()),
      date: extractDate(dateNode) || extractDate(scope.find("time,[datetime]").first()),
      image: extractImage($, scope, imageNode, baseUrl),
      custom: extractCustomFields($, scope, source.customFields, baseUrl),
      score: 1000 - index
    });
  });
  return items;
}

function firstWithin($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>, selector: string): cheerio.Cheerio<any> {
  if (!selector) return $();
  const found = scope.find(selector).first();
  if (found.length > 0) return found;
  return scope.is(selector) ? scope : $();
}

function extractLink(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<any>,
  linkNode: cheerio.Cheerio<any>,
  baseUrl: string
): string | undefined {
  const direct = absoluteUrl(linkNode.attr("href"), baseUrl);
  if (direct) return direct;

  const nested = absoluteUrl(linkNode.find("a[href]").first().attr("href"), baseUrl);
  if (nested) return nested;

  return absoluteUrl(scope.find("a[href]").first().attr("href"), baseUrl);
}

function extractDate(node: cheerio.Cheerio<any>): string | undefined {
  const raw =
    node.attr("datetime") ||
    node.attr("content") ||
    node.attr("title") ||
    node.attr("aria-label") ||
    node.text();
  return toDateString(normalizeText(raw));
}

function extractImage(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<any>,
  imageNode: cheerio.Cheerio<any>,
  baseUrl: string
): string | undefined {
  const node = imageNode.length > 0 ? imageNode : scope.find("img,source,[style*='background']").first();
  return (
    absoluteUrl(node.attr("content"), baseUrl) ||
    absoluteUrl(node.attr("src"), baseUrl) ||
    absoluteUrl(node.attr("data-src"), baseUrl) ||
    absoluteUrl(node.attr("data-lazy-src"), baseUrl) ||
    absoluteUrl(firstSrcsetUrl(node.attr("srcset")), baseUrl) ||
    absoluteUrl(backgroundImageUrl(node.attr("style")), baseUrl)
  );
}

function extractCustomFields(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<any>,
  customFields: CustomFieldConfig[],
  baseUrl: string
): Record<string, string> | undefined {
  const custom: Record<string, string> = {};

  for (const field of customFields) {
    if (field.mode === "static") {
      const value = truncateText(field.value, 1000);
      if (value) custom[field.name] = value;
      continue;
    }

    const node = firstWithin($, scope, field.selector);
    if (node.length === 0) continue;
    const value = extractFieldValue(node, field.attr, baseUrl);
    if (value) custom[field.name] = value;
  }

  return Object.keys(custom).length > 0 ? custom : undefined;
}

function extractFieldValue(node: cheerio.Cheerio<any>, attr: CustomFieldConfig["attr"], baseUrl: string): string {
  if (attr === "html") return truncateText(node.html() ?? "", 1500) ?? "";
  if (attr === "href") return absoluteUrl(node.attr("href") || node.find("a[href]").first().attr("href"), baseUrl) ?? "";
  if (attr === "src") {
    return (
      absoluteUrl(node.attr("src"), baseUrl) ||
      absoluteUrl(node.attr("data-src"), baseUrl) ||
      absoluteUrl(firstSrcsetUrl(node.attr("srcset")), baseUrl) ||
      absoluteUrl(node.find("img,source").first().attr("src"), baseUrl) ||
      ""
    );
  }
  if (attr === "datetime") return normalizeText(node.attr("datetime") || node.text());
  if (attr === "content") return normalizeText(node.attr("content") || node.text());
  return truncateText(node.text() || node.attr("alt") || node.attr("title"), 700) ?? "";
}

function firstSrcsetUrl(value: string | undefined): string | undefined {
  return value?.split(",")[0]?.trim().split(/\s+/)[0];
}

function backgroundImageUrl(value: string | undefined): string | undefined {
  const match = value?.match(/url\((['"]?)(.*?)\1\)/i);
  return match?.[2];
}

function extractAutomatically($: cheerio.CheerioAPI, source: SourceConfig, baseUrl: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];

  $(CONTAINER_SELECTOR)
    .slice(0, 300)
    .each((index, element) => {
      const scope = $(element);
      if (scope.parents("nav,header,footer,aside,form,[role='navigation']").length > 0) return;
      const linkNode = bestAnchor($, scope, baseUrl);
      const link = absoluteUrl(linkNode.attr("href"), baseUrl);
      if (!link) return;

      const titleNode = bestTitleNode($, scope, linkNode);
      const title = normalizeText(titleNode.text()) || normalizeText(linkNode.text());
      if (!isCandidateLink(title, link, baseUrl, source)) return;

      const summary = truncateText(scope.find("p").first().text() || scope.attr("aria-label"), 500);
      const image = extractImage($, scope, $(), baseUrl);
      const date = extractDate(scope.find("time,[datetime]").first());

      items.push({
        title,
        link,
        summary,
        image,
        date,
        score: 800 - index + scoreUrl(link, baseUrl) + Math.min(title.length, 90)
      });
    });

  $("main a[href],article a[href],body a[href]")
    .slice(0, 1200)
    .each((index, element) => {
      const linkNode = $(element);
      if (linkNode.parents("nav,header,footer,aside,form,[role='navigation']").length > 0) return;

      const link = absoluteUrl(linkNode.attr("href"), baseUrl);
      const title = normalizeText(linkNode.text() || linkNode.attr("title") || linkNode.attr("aria-label"));
      if (!link || !isCandidateLink(title, link, baseUrl, source)) return;

      const scope = linkNode.closest(CONTAINER_SELECTOR);
      const summary = truncateText(scope.find("p").first().text(), 500);
      const image = scope.length > 0 ? extractImage($, scope, $(), baseUrl) : undefined;
      const date = scope.length > 0 ? extractDate(scope.find("time,[datetime]").first()) : undefined;

      items.push({
        title,
        link,
        summary,
        image,
        date,
        score: 300 - index / 10 + scoreUrl(link, baseUrl) + Math.min(title.length, 120)
      });
    });

  return items;
}

function bestAnchor($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>, baseUrl: string): cheerio.Cheerio<any> {
  const candidates = scope
    .find("a[href]")
    .toArray()
    .map((element) => {
      const node = $(element);
      const text = normalizeText(node.text() || node.attr("title") || node.attr("aria-label"));
      const link = absoluteUrl(node.attr("href"), baseUrl);
      if (!link || text.length < 5) return undefined;

      const markerText = normalizeText(
        `${node.attr("class") ?? ""} ${node.attr("id") ?? ""} ${node.attr("data-testid") ?? ""} ${node.attr("rel") ?? ""}`
      );
      let score = Math.min(text.length, 120) + scoreUrl(link, baseUrl);
      if (node.closest("h1,h2,h3").length > 0) score += 18;
      if (/(bookmark|headline|heading|title)/i.test(markerText)) score += 36;
      if (SKIP_LINK_TEXT.test(text) || SKIP_PATH.test(new URL(link).pathname)) score -= 120;

      return { node, score };
    })
    .filter(Boolean) as Array<{ node: cheerio.Cheerio<any>; score: number }>;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.node ?? $();
}

function bestTitleNode(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<any>,
  fallback: cheerio.Cheerio<any>
): cheerio.Cheerio<any> {
  const titleNode = scope
    .find("h1,h2,h3,[class*='title'],[data-testid*='title']")
    .filter((_, element) => normalizeText($(element).text()).length >= 5)
    .first();

  if (titleNode.length === 0) return fallback;

  const titleText = normalizeText(titleNode.text());
  const fallbackText = normalizeText(fallback.text());
  return fallbackText.length > titleText.length + 6 ? fallback : titleNode;
}

function isCandidateLink(title: string, link: string, baseUrl: string, source: SourceConfig): boolean {
  if (title.length < 8 || title.length > 220) return false;
  if (SKIP_LINK_TEXT.test(title)) return false;
  if (isLikelyAssetUrl(link)) return false;
  if (SKIP_PATH.test(new URL(link).pathname)) return false;
  if (!sameRegistrableHost(link, baseUrl) && source.includePatterns.length === 0) return false;
  return true;
}

function scoreUrl(link: string, baseUrl: string): number {
  const url = new URL(link);
  const base = new URL(baseUrl);
  let score = 0;
  if (sameRegistrableHost(link, baseUrl)) score += 60;
  if (url.pathname !== "/" && url.pathname !== base.pathname) score += 30;
  if (/\/\d{4}\/\d{1,2}\//.test(url.pathname) || /\d{4}-\d{2}-\d{2}/.test(url.pathname)) score += 40;
  score += Math.min(url.pathname.split("/").filter(Boolean).length * 10, 50);
  return score;
}

function extractReadableArticle(
  html: string,
  source: SourceConfig,
  baseUrl: string,
  $: cheerio.CheerioAPI,
  issues: ExtractionIssue[]
): ExtractedItem[] {
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const article = new Readability(dom.window.document).parse();
    if (!article?.title) return [];

    const date =
      toDateString($("meta[property='article:published_time']").attr("content")) ||
      toDateString($("meta[name='date']").attr("content")) ||
      toDateString($("time[datetime]").first().attr("datetime"));

    const image =
      absoluteUrl($("meta[property='og:image']").attr("content"), baseUrl) ||
      absoluteUrl($("meta[name='twitter:image']").attr("content"), baseUrl);

    return [
      {
        title: normalizeText(article.title),
        link: baseUrl,
        summary: truncateText(article.excerpt || article.textContent || undefined, 700),
        date,
        image,
        author: normalizeText(article.byline),
        score: 100
      }
    ].filter((item) => filterItemByPatterns(item, source));
  } catch (error) {
    issues.push({
      code: "readability_failed",
      message: `Article fallback failed: ${(error as Error).message}`
    });
    return [];
  }
}

function prepareItems(items: ExtractedItem[], source: SourceConfig): ExtractedItem[] {
  const byUrl = new Map<string, ExtractedItem>();

  for (const item of items) {
    if (!item.title || !item.link) continue;
    if (!filterItemByPatterns(item, source)) continue;

    let canonical: string;
    try {
      canonical = canonicalItemUrl(item.link);
    } catch {
      continue;
    }

    const existing = byUrl.get(canonical);
    const prepared = {
      ...item,
      title: normalizeText(item.title),
      link: canonical,
      summary: truncateText(item.summary),
      custom: cleanCustomValues(item.custom),
      guid: item.guid || canonical
    };

    if (!existing || (prepared.score ?? 0) > (existing.score ?? 0)) {
      byUrl.set(canonical, prepared);
    }
  }

  return [...byUrl.values()]
    .sort((a, b) => {
      const dateA = Date.parse(a.date ?? "");
      const dateB = Date.parse(b.date ?? "");
      if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) return dateB - dateA;
      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, source.maxItems);
}

function cleanCustomValues(custom: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!custom) return undefined;
  const clean = Object.fromEntries(
    Object.entries(custom)
      .map(([key, value]) => [key, truncateText(value, 1000) ?? ""] as const)
      .filter(([, value]) => Boolean(value))
  );
  return Object.keys(clean).length > 0 ? clean : undefined;
}
