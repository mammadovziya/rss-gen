import RSS from "rss";
import type { ExtractionResult, SourceConfig } from "./types";
import { absoluteUrl, normalizeText, truncateText } from "./utils";

export function renderRssXml(source: SourceConfig, result: ExtractionResult, feedUrl: string): string {
  const siteUrl = result.finalUrl || source.url;
  const title = normalizeText(source.feed.title) || result.title || source.name || new URL(source.url).hostname;
  const description =
    normalizeText(source.feed.description) ||
    result.description ||
    `Custom RSS feed generated locally from ${new URL(source.url).hostname}.`;

  const feed = new RSS({
    title,
    description,
    feed_url: feedUrl,
    site_url: siteUrl,
    language: source.feed.language || "en",
    image_url: absoluteUrl(source.feed.image, siteUrl),
    copyright: source.feed.copyright || undefined,
    pubDate: new Date(result.fetchedAt),
    ttl: Math.max(source.cacheMinutes, 1),
    generator: "Local RSS Generator",
    custom_namespaces: {
      media: "http://search.yahoo.com/mrss/",
      rssgen: "https://local.rss-generator/custom"
    }
  });

  for (const item of result.items) {
    const itemDate = item.date ? new Date(item.date) : new Date(result.fetchedAt);
    feed.item({
      title: item.title,
      description: truncateText(item.summary, 1500) ?? "",
      url: item.link,
      guid: item.guid ?? item.link,
      author: item.author || source.feed.author || undefined,
      date: Number.isNaN(itemDate.getTime()) ? new Date(result.fetchedAt) : itemDate,
      custom_elements: customElementsForItem(item)
    });
  }

  return feed.xml({ indent: true });
}

function customElementsForItem(item: ExtractionResult["items"][number]) {
  const elements: Array<Record<string, unknown>> = [];

  if (item.image) {
    elements.push({
      "media:content": {
        _attr: {
          url: item.image,
          medium: "image"
        }
      }
    });
  }

  for (const [name, value] of Object.entries(item.custom ?? {})) {
    elements.push({
      [`rssgen:${xmlName(name)}`]: value
    });
  }

  return elements.length > 0 ? elements : undefined;
}

function xmlName(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_.-]/g, "_");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `field_${cleaned}`;
}
