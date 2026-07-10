import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSS Gen",
  description: "Local visual RSS feed builder for websites without feeds.",
  openGraph: {
    title: "RSS Gen",
    description: "Local visual RSS feed builder for websites without feeds.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
