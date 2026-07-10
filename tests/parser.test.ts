import { describe, expect, it } from "vitest";
import { parseDocument } from "../src/extraction/parser.js";
import { renderRssXml } from "../src/feed.js";
import { sourceConfigSchema } from "../src/types.js";

describe("parseDocument", () => {
  it("extracts article cards automatically", () => {
    const source = sourceConfigSchema.parse({
      url: "https://example.com/news",
      maxItems: 10
    });

    const result = parseDocument(
      {
        finalUrl: "https://example.com/news",
        status: 200,
        strategy: "static",
        html: `
          <html>
            <head><title>Example News</title></head>
            <body>
              <main>
                <article>
                  <h2><a href="/news/2026/first?utm_source=test">First useful story</a></h2>
                  <time datetime="2026-06-29T10:00:00Z"></time>
                  <p>A useful summary for the first story.</p>
                </article>
                <article>
                  <h2><a href="/news/2026/second">Second useful story</a></h2>
                  <p>A useful summary for the second story.</p>
                </article>
              </main>
            </body>
          </html>
        `
      },
      source
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("First useful story");
    expect(result.items[0].link).toBe("https://example.com/news/2026/first");
  });

  it("uses explicit selectors when provided", () => {
    const source = sourceConfigSchema.parse({
      url: "https://example.com",
      selectors: {
        item: ".row",
        title: ".headline",
        link: ".headline",
        summary: ".deck",
        date: "time",
        image: "img"
      }
    });

    const result = parseDocument(
      {
        finalUrl: "https://example.com",
        status: 200,
        strategy: "static",
        html: `
          <section>
            <div class="row">
              <a class="headline" href="/a">Selector driven story</a>
              <p class="deck">Selector summary.</p>
              <time datetime="2026-06-30T08:00:00Z"></time>
              <img src="/image.jpg" />
            </div>
          </section>
        `
      },
      source
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      title: "Selector driven story",
      link: "https://example.com/a",
      summary: "Selector summary.",
      image: "https://example.com/image.jpg"
    });
  });

  it("prefers story links over category links inside article cards", () => {
    const source = sourceConfigSchema.parse({
      url: "https://example.com/blog",
      maxItems: 10
    });

    const result = parseDocument(
      {
        finalUrl: "https://example.com/blog",
        status: 200,
        strategy: "static",
        html: `
          <main>
            <article>
              <h2><a href="/blog/releases">Releases</a></h2>
              <a class="headline" href="/blog/releases/node-v24-3-0">Node.js v24.3.0 released</a>
              <p>A release announcement summary.</p>
            </article>
          </main>
        `
      },
      source
    );

    expect(result.items[0]).toMatchObject({
      title: "Node.js v24.3.0 released",
      link: "https://example.com/blog/releases/node-v24-3-0"
    });
  });

  it("extracts custom fields from selected cards and renders them in RSS", () => {
    const source = sourceConfigSchema.parse({
      url: "https://example.com/products",
      selectors: {
        item: ".product",
        title: ".name",
        link: "a.name",
        summary: ".desc"
      },
      customFields: [
        {
          name: "price",
          selector: ".price",
          attr: "text"
        },
        {
          name: "source",
          mode: "static",
          value: "Manual value"
        }
      ]
    });

    const result = parseDocument(
      {
        finalUrl: "https://example.com/products",
        status: 200,
        strategy: "static",
        html: `
          <main>
            <article class="product">
              <a class="name" href="/p/1">Useful product update</a>
              <p class="desc">Product summary.</p>
              <strong class="price">$19</strong>
            </article>
          </main>
        `
      },
      source
    );

    expect(result.items[0].custom).toEqual({ price: "$19", source: "Manual value" });
    expect(renderRssXml(source, result, "https://example.com/feed.xml")).toContain("<rssgen:price>$19</rssgen:price>");
    expect(renderRssXml(source, result, "https://example.com/feed.xml")).toContain(
      "<rssgen:source>Manual value</rssgen:source>"
    );
  });
});
