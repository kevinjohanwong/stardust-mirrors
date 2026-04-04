import { headers } from "next/headers";
import { getPublisher } from "@/lib/publishers";
import { getAllArticleUrls } from "@/lib/supabase";

export const revalidate = 3600;

function urlToMirrorPath(url: string, host: string): string {
  try {
    const path = new URL(url).pathname;
    return `https://${host}${path}`;
  } catch {
    return `https://${host}/`;
  }
}

export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  if (!publisher) {
    return new Response("<urlset></urlset>", {
      headers: { "Content-Type": "application/xml" },
    });
  }

  const articles = await getAllArticleUrls(publisher.publisherId);

  const urls = articles
    .map((a) => {
      const mirrorUrl = urlToMirrorPath(a.url, host);
      const lastmod = new Date(a.created_at).toISOString().split("T")[0];
      return `  <url>
    <loc>${mirrorUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${host}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
