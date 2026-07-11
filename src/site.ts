function resolveSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "https://rss-gen.vercel.app";
  return (value.startsWith("http") ? value : `https://${value}`).replace(/\/$/, "");
}

export const siteConfig = {
  name: "RSS Gen",
  title: "RSS Gen - Visual RSS Feed Generator for Any Website",
  description:
    "Create custom RSS feeds from websites without RSS. Open a page, select cards, titles, links, images, dates, and export a clean feed.",
  url: resolveSiteUrl(),
  repository: "https://github.com/mammadovziya/rss-gen",
  creator: {
    name: "Ziya Mammadov",
    url: "https://github.com/mammadovziya"
  },
  keywords: [
    "RSS generator",
    "RSS feed generator",
    "custom RSS feed",
    "visual RSS builder",
    "website RSS feed",
    "RSS feed builder",
    "feed generator",
    "web scraping RSS",
    "Next.js RSS",
    "self-hosted RSS"
  ]
} as const;
