import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPublisher } from "@/lib/publishers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  return {
    title: publisher?.name || "Stardust",
    description: publisher?.description || "",
    // robots.txt handles crawler differentiation (AI bots allowed, SEO bots blocked)
    // Do NOT set noindex here — it would block AI crawlers from indexing content
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* No tracking scripts. No analytics. No external fonts. Pure signal. */}
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "1rem" }}>
        {children}
      </body>
    </html>
  );
}
