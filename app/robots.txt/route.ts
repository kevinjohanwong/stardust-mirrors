import { headers } from "next/headers";
import { getPublisher } from "@/lib/publishers";

export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);
  const siteUrl = `https://${host}`;

  const robots = `# Stardust AI Mirror — AI crawlers welcome, SEO bots blocked

# Traditional search engines — do not index this mirror
User-agent: Googlebot
Disallow: /

User-agent: Bingbot
Disallow: /

User-agent: Slurp
Disallow: /

User-agent: DuckDuckBot
Disallow: /

User-agent: Baiduspider
Disallow: /

User-agent: YandexBot
Disallow: /

# AI training and retrieval crawlers — full access
User-agent: GPTBot
Allow: /

User-agent: Claude-Bot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: cohere-ai
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
${publisher ? `# Publisher: ${publisher.name} — ${publisher.realUrl}` : ""}
`;

  return new Response(robots, {
    headers: { "Content-Type": "text/plain" },
  });
}
