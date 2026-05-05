/**
 * Scraper for kicksfinder.com
 * Uses Firecrawl to crawl the site and stores articles in Supabase.
 *
 * Run with: bun scripts/scrape-kicksfinder.ts
 */

import FirecrawlApp from "@mendable/firecrawl-js";
import { createClient } from "@supabase/supabase-js";

const PUBLISHER_ID = "777c44d5-5e50-42ca-ac72-67644be28fd6";
const BASE_URL = "https://kicksfinder.com";
const MIN_CONTENT_LENGTH = 10;

// Validate required env vars (Bun auto-loads .env/.env.local)
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!FIRECRAWL_API_KEY) {
  console.error("ERROR: FIRECRAWL_API_KEY is not set");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  process.exit(1);
}

const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ArticleRow {
  slug: string;
  publisher_id: string;
  title: string;
  url: string;
  content: string;
  scraped_at: string;
}

function slugFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function isArticlePath(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    // Skip root
    if (pathname === "/" || pathname.length < 2) return false;
    // Skip sitemaps, feeds, static files
    if (pathname.match(/\.(xml|json|rss|txt|css|js|ico|png|jpg|gif|svg)$/i)) return false;
    // Skip store-locator, search, tag pages
    if (pathname.startsWith("/store-locator") || pathname.startsWith("/search") || pathname.startsWith("/tag")) return false;
    // Accept sneakers/* paths
    if (pathname.startsWith("/sneakers/")) return true;
    // Accept paths with hyphens (shoe/brand collection pages like /air-jordan-1, /lebron-james, etc.)
    const slug = pathname.replace(/^\/|\/$/g, "");
    if (slug.includes("-") || slug.length > 3) return true;
    return false;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`Starting KicksFinder crawl: ${BASE_URL}`);
  console.log(`Settings: maxDepth=2, limit=50\n`);

  let crawlResult: Awaited<ReturnType<typeof firecrawl.crawl>>;

  try {
    crawlResult = await firecrawl.crawl(BASE_URL, {
      limit: 50,
      maxDepth: 2,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    });
  } catch (err) {
    console.error("Firecrawl crawl failed:", err);
    process.exit(1);
  }

  // crawl() returns { success, data } or just { data } depending on version
  const pages = (crawlResult as any).data ?? (Array.isArray(crawlResult) ? crawlResult : []);
  console.log(`Crawl complete. Total pages returned: ${pages.length}\n`);

  let scraped = 0;
  let skipped = 0;
  let errors = 0;

  for (const page of pages) {
    const url: string = page.metadata?.url ?? page.metadata?.sourceURL ?? "";
    if (!url) {
      console.log(`  SKIP (no URL)`);
      skipped++;
      continue;
    }

    // Filter to article-like paths
    if (!isArticlePath(url)) {
      console.log(`  SKIP (not article path): ${url}`);
      skipped++;
      continue;
    }

    // Extract title from og:title, title tag, or first h1
    const title: string =
      page.metadata?.ogTitle ??
      page.metadata?.title ??
      (() => {
        const h1Match = (page.markdown ?? "").match(/^#\s+(.+)$/m);
        return h1Match?.[1] ?? "";
      })();

    if (!title || title.trim().length === 0) {
      console.log(`  SKIP (no title): ${url}`);
      skipped++;
      continue;
    }

    const content: string = page.markdown ?? "";
    if (content.trim().length < MIN_CONTENT_LENGTH) {
      console.log(`  SKIP (content too short: ${content.trim().length} chars): ${url}`);
      skipped++;
      continue;
    }

    // Extract publish date (used as crawled_at)
    const rawDate: string =
      page.metadata?.["article:published_time"] ??
      page.metadata?.publishedTime ??
      page.metadata?.ogArticlePublishedTime ??
      "";
    const crawled_at = rawDate
      ? new Date(rawDate).toISOString()
      : new Date().toISOString();

    const article: ArticleRow = {
      slug: slugFromUrl(url),
      publisher_id: PUBLISHER_ID,
      title: title.trim(),
      url,
      content,
      scraped_at: crawled_at,
    };

    try {
      const { error } = await supabase
        .from("articles")
        .upsert(article, { onConflict: "slug" });

      if (error) {
        console.error(`  ERROR upserting ${url}:`, error.message);
        errors++;
      } else {
        console.log(`  OK: ${title.trim().slice(0, 60)} — ${url}`);
        scraped++;
      }
    } catch (err) {
      console.error(`  ERROR (exception) upserting ${url}:`, err);
      errors++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Pages returned by Firecrawl : ${pages.length}`);
  console.log(`Scraped (upserted)          : ${scraped}`);
  console.log(`Skipped                     : ${skipped}`);
  console.log(`Errors                      : ${errors}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
