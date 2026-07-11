import { siteConfig } from "@/site";
import { RssBuilderClient } from "./rss-builder-client";

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    codeRepository: siteConfig.repository,
    author: {
      "@type": "Person",
      name: siteConfig.creator.name,
      url: siteConfig.creator.url
    },
    description: siteConfig.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    },
    featureList: [
      "Visual RSS feed builder",
      "Custom RSS feeds from websites without native feeds",
      "Cursor-based field selection",
      "Custom feed fields",
      "Docker and Vercel deployment"
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RssBuilderClient />
    </>
  );
}
