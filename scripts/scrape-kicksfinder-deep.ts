/**
 * Deep scraper for kicksfinder.com individual release pages.
 *
 * Strategy:
 * 1. Use Firecrawl `map` to discover all URLs on the site
 * 2. Filter to individual release pages (under /sneakers/ or numeric slugs)
 * 3. Batch scrape them and upsert to Supabase
 *
 * Run: bun scripts/scrape-kicksfinder-deep.ts
 * Dry run (discover only): bun scripts/scrape-kicksfinder-deep.ts --dry-run
 * Limit pages: bun scripts/scrape-kicksfinder-deep.ts --limit 100
 */

import FirecrawlApp from "@mendable/firecrawl-js";
import { createClient } from "@supabase/supabase-js";

const PUBLISHER_ID = "777c44d5-5e50-42ca-ac72-67644be28fd6";
const BASE_URL = "https://kicksfinder.com";
const BATCH_SIZE = 10; // scrape N pages concurrently
const MIN_CONTENT_LENGTH = 200;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit=") || a === "--limit");
const LIMIT = limitArg
  ? parseInt(args[args.indexOf(limitArg) + (limitArg.includes("=") ? 0 : 1)]?.replace("--limit=", "") ?? "9999")
  : 9999;

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!FIRECRAWL_API_KEY) { console.error("FIRECRAWL_API_KEY not set"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error("Supabase env vars not set"); process.exit(1); }

const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function slugFromUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function isReleasePage(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    if (pathname === "/" || pathname.length < 2) return false;
    if (/\.(xml|json|rss|txt|css|js|ico|png|jpg|gif|svg)$/i.test(pathname)) return false;
    if (/^\/(store-locator|search|tag|signin|signup|profile|watchlist|account)/.test(pathname)) return false;
    // Individual sneaker release pages
    if (pathname.startsWith("/sneakers/")) return true;
    // Numeric product IDs like /100230334
    if (/^\/\d{6,}/.test(pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

async function scrapeOne(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
      onlyMainContent: true,
    });
    const page = result as any;
    const title: string =
      page.metadata?.ogTitle ?? page.metadata?.title ??
      (page.markdown ?? "").match(/^#\s+(.+)$/m)?.[1] ?? "";
    const content: string = page.markdown ?? "";
    if (!title || content.length < MIN_CONTENT_LENGTH) return null;
    return { title: title.trim(), content };
  } catch {
    return null;
  }
}

async function upsertArticle(url: string, title: string, content: string) {
  const { error } = await supabase.from("articles").upsert(
    { slug: slugFromUrl(url), publisher_id: PUBLISHER_ID, title, url, content, scraped_at: new Date().toISOString() },
    { onConflict: "slug" }
  );
  if (error) throw new Error(error.message);
}

async function main() {
  console.log(`\n🔍 Mapping kicksfinder.com to discover all URLs...`);

  // Step 1: map all URLs
  let allUrls: string[] = [];
  try {
    const mapResult = await (firecrawl as any).map(BASE_URL, { limit: 5000 });
    allUrls = (mapResult?.links ?? mapResult?.urls ?? []) as string[];
  } catch (err) {
    console.error("map() failed, falling back to crawl for URL discovery:", err);
    // Fallback: crawl with high limit, no-content mode
    const crawl = await firecrawl.crawl(BASE_URL, { limit: 500, maxDepth: 3, scrapeOptions: { formats: [] } });
    allUrls = ((crawl as any).data ?? []).map((p: any) => p.metadata?.url ?? p.metadata?.sourceURL ?? "").filter(Boolean);
  }

  console.log(`   Total URLs discovered: ${allUrls.length}`);

  // Step 2: filter to individual release pages
  const releaseUrls = allUrls.filter(isReleasePage).slice(0, LIMIT);
  console.log(`   Release pages after filter: ${releaseUrls.length}`);

  if (DRY_RUN) {
    console.log("\n--- DRY RUN: sample URLs ---");
    releaseUrls.slice(0, 20).forEach((u) => console.log(" ", u));
    console.log(`\n(${releaseUrls.length} total, would scrape all)`);
    return;
  }

  if (releaseUrls.length === 0) {
    console.log("No release pages found. Try --dry-run to inspect discovered URLs.");
    return;
  }

  // Step 3: check which slugs already exist to skip re-scraping
  const slugsToFetch = releaseUrls.map(slugFromUrl);
  const { data: existing } = await supabase
    .from("articles")
    .select("slug")
    .eq("publisher_id", PUBLISHER_ID)
    .in("slug", slugsToFetch);
  const existingSlugs = new Set((existing ?? []).map((r: any) => r.slug));
  const toScrape = releaseUrls.filter((u) => !existingSlugs.has(slugFromUrl(u)));
  console.log(`\n   Already in DB: ${existingSlugs.size} | New to scrape: ${toScrape.length}\n`);

  // Step 4: batch scrape
  let scraped = 0, skipped = 0, errors = 0;
  for (let i = 0; i < toScrape.length; i += BATCH_SIZE) {
    const batch = toScrape.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const data = await scrapeOne(url);
        if (!data) { skipped++; return; }
        await upsertArticle(url, data.title, data.content);
        scraped++;
        console.log(`  ✓ [${scraped + skipped + errors}/${toScrape.length}] ${data.title.slice(0, 60)}`);
      })
    );
    results.forEach((r) => { if (r.status === "rejected") { errors++; console.error("  ✗", r.reason); } });
    // brief pause between batches to avoid rate limits
    if (i + BATCH_SIZE < toScrape.length) await Bun.sleep(500);
  }

  console.log("\n=== Done ===");
  console.log(`Scraped: ${scraped} | Skipped (thin content): ${skipped} | Errors: ${errors}`);
  console.log(`Total in DB now: ~${existingSlugs.size + scraped}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
