# RSS Generator

A fully local, Docker-ready RSS feed generator for websites. It can build ad-hoc RSS feeds or saved feed recipes with a visual point-and-click builder, custom metadata, filters, cache timing, custom item data, and a browser-rendered extraction mode for JavaScript-heavy pages.

## Privacy Model

RSS Generator is private-by-default for local use:

- Binds to `127.0.0.1` by default when run directly.
- Docker Compose publishes only to `127.0.0.1:3000`.
- No telemetry, analytics, accounts, cloud storage, or third-party app services.
- Saved feeds and feed health history stay in the local `DATA_DIR`.
- Cross-origin browser access is disabled unless `CORS_ORIGIN` is explicitly set.
- Fetches to localhost, private IPs, link-local ranges, and internal hostnames are blocked by default.
- Static fetch redirects are validated before following.
- Browser-rendered mode blocks private-network document/subresource requests.

Important: target websites still see the IP address of the machine, server, VPN, or proxy that fetches them. No app can guarantee 100% internet anonymity by itself. Use a trusted network-level proxy/VPN if IP anonymity is required.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Visual Builder

1. Enter a website URL.
2. Select `Open Page`.
3. Pick `Feed Card`, then click one repeated item on the loaded page.
4. Pick `Title`, `Link`, `Summary`, `Image`, `Date`, or `Custom Data`, then click the matching element inside a card.
5. Select `Preview`, then `Save`.

The app converts those clicks into selectors for you. The advanced selector fields remain available for difficult pages.

## Run With Docker

```bash
docker compose up --build
```

The app is exposed only on `http://127.0.0.1:3000`. Saved feed recipes and health checks are stored in `./data` through the Docker volume.

## Environment

- `PORT`: HTTP port, default `3000`.
- `HOST`: bind host, default `127.0.0.1`. Use `0.0.0.0` only behind a trusted firewall or reverse proxy.
- `DATA_DIR`: local storage directory, default `./data`.
- `CORS_ORIGIN`: optional single allowed browser origin. Empty means same-origin only.
- `ALLOW_PRIVATE_NETWORK_TARGETS`: set to `true` only if you intentionally need to fetch internal/private network URLs.
- `RATE_LIMIT_WINDOW_MS`: request rate window, default `60000`.
- `RATE_LIMIT_MAX`: max API/feed requests per window, default `120`.
- `DEFAULT_USER_AGENT`: optional generic user agent override.
- `REQUEST_TIMEOUT_MS`, `BROWSER_TIMEOUT_MS`, `MAX_ITEMS`: extraction limits.

## Feed URLs

- Saved recipe: `http://localhost:3000/rss/<feed-id>.xml`
- Ad-hoc feed: `http://localhost:3000/feed.xml?url=https%3A%2F%2Fexample.com%2Fnews`

## API

```http
POST /api/preview
POST /api/feeds
PUT /api/feeds/:id
GET /api/feeds
GET /api/feed-health
POST /api/feeds/:id/test
GET /api/privacy
GET /api/export
POST /api/import
GET /rss/:id.xml
GET /feed.xml?url=...
```

Example preview payload:

```json
{
  "url": "https://example.com/news",
  "name": "Example News",
  "mode": "auto",
  "maxItems": 25,
  "cacheMinutes": 30,
  "includePatterns": [],
  "excludePatterns": ["sponsored"],
  "customFields": [
    {
      "name": "price",
      "selector": ".price",
      "attr": "text"
    }
  ],
  "selectors": {
    "item": "article",
    "title": "h2",
    "link": "a[href]",
    "summary": "p",
    "date": "time",
    "image": "img"
  },
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

## Extraction Modes

- `auto`: Tries static HTML first, then local Chromium rendering if the page is blocked, empty, or too sparse.
- `static`: Fast HTML fetch with normal browser-like headers.
- `browser`: Uses Playwright Chromium locally for JavaScript-rendered pages.

The tool can handle many sites that require JavaScript rendering or precise selectors. It does not bypass CAPTCHA, authentication, paywalls, robots restrictions, or access-control systems.

## Feed Health And Backups

The sidebar shows a privacy summary, import/export controls, and a health badge for each saved feed. Use `Test` to refresh health status, item count, extraction mode, and the last error or warning.

Use `Export` to download a local JSON backup. Use `Import` to merge a backup into the current local store.

## Verification

```bash
npm run typecheck
npm test
npm run build
```
