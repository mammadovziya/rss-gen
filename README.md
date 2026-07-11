# RSS Gen

RSS Gen is a Docker-ready and Vercel-ready RSS feed builder for websites that do not offer a feed of their own. It is built with Next.js App Router, React, TypeScript, Playwright, and optional Upstash Redis persistence.

Open a page, click the repeated card, choose the title/link/image/date fields with your cursor, and RSS Gen turns that into a reusable RSS recipe. It can render JavaScript-heavy pages with local Chromium or a remote browser endpoint, add custom metadata, test saved feeds, and export/import your feed library.

## Highlights

- Visual feed builder: pick cards, titles, links, summaries, images, dates, and custom fields by clicking the page.
- Custom data: extract extra fields from each card or add fixed values without writing selectors.
- Local or hosted: runs on your machine, inside Docker, or on Vercel.
- JavaScript support: use static HTML extraction, local Playwright Chromium, or a remote browser endpoint.
- Feed recipes: save reusable feeds and expose them at stable local RSS URLs.
- Ad-hoc feeds: generate a one-off RSS URL directly from query parameters.
- Health checks: test saved feeds and keep the latest item count, extraction mode, warnings, and errors.
- Backups: export and import your saved feed recipes as JSON.
- Filters: include or exclude items with text, URL fragments, or regular expressions.
- Multilingual UI: English, Russian, Spanish, Chinese, Turkish, and Azerbaijani.

## Quick Start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Docker

```bash
docker compose up --build
```

Docker Compose exposes the app only on:

```text
http://127.0.0.1:3000
```

Saved feeds, backups, and health data are stored in `./data`.

## Vercel

RSS Gen deploys as a standard Next.js app. For production hosting, add persistent storage before relying on saved feeds.

1. Push the repo to GitHub.
2. In Vercel, create a new project from the repo. Framework preset: `Next.js`.
3. Add the Upstash Redis integration from the Vercel Marketplace. It should provide:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy.

Optional for JavaScript-heavy sites:

```text
BROWSER_WS_ENDPOINT=wss://your-browser-provider.example
BROWSER_WS_MODE=cdp
```

Without Redis, Vercel can still build and preview pages, but saved feed recipes are not durable. Without a remote browser endpoint, static extraction still works; browser mode is best kept for Docker/local runs or a hosted browser service.

CLI deployment:

```bash
npm i -g vercel
vercel login
vercel link
vercel integration add upstash
vercel --prod
```

## How It Works

1. Enter a website URL.
2. Click `Open Page`.
3. Select `Feed Card`, then click one repeated item in the page preview.
4. Pick `Title`, `Link`, `Summary`, `Image`, and `Date` by clicking inside the selected card.
5. Add `Custom Data` when you need extra fields such as price, category, author, source, or a fixed label.
6. Click `Preview`.
7. Save the recipe and use the generated RSS URL.

Advanced selector fields are still available when a page needs manual tuning.

## Feed URLs

Saved recipe:

```text
http://localhost:3000/rss/<feed-id>.xml
```

Ad-hoc feed:

```text
http://localhost:3000/feed.xml?url=https%3A%2F%2Fexample.com%2Fnews
```

## Extraction Modes

- `auto`: tries static HTML first, then local Chromium when the page is blocked, empty, or too sparse.
- `static`: fast HTML fetch with browser-like request headers.
- `browser`: local Playwright Chromium rendering for JavaScript-heavy pages.

RSS Gen does not bypass CAPTCHA, login walls, paywalls, robots restrictions, or access-control systems.

## API

```http
GET    /health
GET    /api/privacy
GET    /api/feeds
GET    /api/feeds/:id
POST   /api/preview
POST   /api/builder-page
POST   /api/feeds
PUT    /api/feeds/:id
DELETE /api/feeds/:id
GET    /api/feed-health
POST   /api/feeds/:id/test
GET    /api/export
POST   /api/import
GET    /rss/:id.xml
GET    /feed.xml?url=...
```

Example preview request:

```json
{
  "url": "https://example.com/news",
  "name": "Example News",
  "mode": "auto",
  "maxItems": 25,
  "cacheMinutes": 30,
  "includePatterns": [],
  "excludePatterns": ["sponsored", "/\\/ads\\//i"],
  "selectors": {
    "item": "article",
    "title": "h2",
    "link": "a[href]",
    "summary": "p",
    "date": "time",
    "image": "img"
  },
  "customFields": [
    {
      "name": "price",
      "mode": "selector",
      "selector": ".price",
      "attr": "text"
    },
    {
      "name": "source",
      "mode": "static",
      "value": "Example"
    }
  ],
  "browser": {
    "waitForSelector": "",
    "waitMs": 0,
    "userAgent": ""
  },
  "feed": {
    "title": "Example News",
    "description": "Custom local RSS feed",
    "language": "en",
    "author": "",
    "image": "",
    "copyright": ""
  }
}
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port. |
| `HOST` | `127.0.0.1` | Bind host for direct Node runs. Use `0.0.0.0` only behind a trusted firewall or reverse proxy. |
| `DATA_DIR` | `./data` | Local storage directory used when Redis is not configured. |
| `UPSTASH_REDIS_REST_URL` | empty | Hosted persistence for saved feeds and feed health. Recommended on Vercel. |
| `UPSTASH_REDIS_REST_TOKEN` | empty | Token for Upstash Redis REST API. |
| `STORAGE_PREFIX` | `rss-gen` | Key prefix for hosted Redis storage. |
| `CORS_ORIGIN` | empty | Optional single allowed browser origin. Empty means same-origin only. |
| `ALLOW_PRIVATE_NETWORK_TARGETS` | `false` | Allow fetching localhost/private-network targets. Keep disabled unless you intentionally need it. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window. |
| `RATE_LIMIT_MAX` | `120` | Max API/feed requests per window. |
| `DEFAULT_USER_AGENT` | built in | Optional generic user-agent override. |
| `REQUEST_TIMEOUT_MS` | built in | Static fetch timeout. |
| `BROWSER_TIMEOUT_MS` | built in | Browser-rendered fetch timeout. |
| `BROWSER_WS_ENDPOINT` | empty | Optional remote Chrome/Browserless endpoint for browser mode on hosted deployments. |
| `BROWSER_WS_MODE` | `cdp` | Use `cdp` for Chrome DevTools endpoints or `playwright` for Playwright server endpoints. |
| `MAX_ITEMS` | built in | Maximum extracted items. |

## Privacy And Safety

RSS Gen is designed for private local or self-hosted use:

- Binds to `127.0.0.1` by default when run directly.
- Docker Compose publishes only to `127.0.0.1:3000`.
- Stores recipes and feed health data locally in `DATA_DIR`, or in Upstash Redis when configured.
- Blocks localhost, private IPs, link-local ranges, and internal hostnames by default.
- Validates static fetch redirects before following them.
- Blocks private-network document and subresource requests in browser mode.
- Sends no telemetry, analytics, or cloud sync.

Target websites still see the IP address of the machine, server, VPN, or proxy that fetches them. Use a trusted network-level proxy or VPN if IP anonymity matters.

## Development

```bash
npm run typecheck
npm test
npm run build
```

The production server starts from:

```bash
npm start
```

## Repository Topics

Recommended GitHub topics:

```text
rss
rss-feed
rss-generator
rss-builder
feed-generator
custom-rss
visual-builder
self-hosted
local-first
docker
nextjs
react
vercel
upstash
typescript
playwright
web-scraping
```
