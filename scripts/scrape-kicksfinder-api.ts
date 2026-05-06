/**
 * KicksFinder API-based scraper.
 *
 * Instead of crawling the SPA, this hits admin.kicksfinder.com/api/products
 * directly (36,099 products across 722 pages) and upserts to Supabase.
 *
 * Run:
 *   bun scripts/scrape-kicksfinder-api.ts              # all products
 *   bun scripts/scrape-kicksfinder-api.ts --pages 5    # first 5 pages (250 products)
 *   bun scripts/scrape-kicksfinder-api.ts --recent     # recently added only
 */

import { createClient } from "@supabase/supabase-js";

const PUBLISHER_ID = "777c44d5-5e50-42ca-ac72-67644be28fd6";
const API_BASE = "https://admin.kicksfinder.com/api";
const KF_BASE = "https://kicksfinder.com";
const PER_PAGE = 50;
const BATCH_DELAY_MS = 100; // polite delay between pages

const args = process.argv.slice(2);
const MAX_PAGES = (() => {
  const i = args.findIndex(a => a === "--pages");
  return i >= 0 ? parseInt(args[i + 1]) : Infinity;
})();
const RECENT_ONLY = args.includes("--recent");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const MIRROR_BASE = process.env.MIRROR_BASE_URL ?? "https://kicksfinder.stardustai.co";
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { console.error("Supabase env vars not set"); process.exit(1); }

async function pingRevalidate() {
  if (!REVALIDATE_SECRET) return;
  try {
    await fetch(`${MIRROR_BASE}/api/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${REVALIDATE_SECRET}` },
    });
  } catch {
    // non-fatal
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface KFProduct {
  id: number;
  slug: string;
  product_name: string;
  product_nickname: string;
  brand_name: string;
  product_model_name: string;
  price: string;
  releaseDate: string;
  show_date: string;
  show_regions: string;
  show_genders: string;
  sku: string;
  collaborators?: string;
  is_past_release: string;
}

function buildContent(p: KFProduct): string {
  const title = [p.product_name.trim(), p.product_nickname?.trim()].filter(Boolean).join(" — ");
  const url = `${KF_BASE}/${p.slug}`;
  const lines = [
    `# ${title}`,
    ``,
    `**Brand:** ${p.brand_name}`,
    p.product_model_name ? `**Model:** ${p.product_model_name}` : "",
    p.price ? `**Retail Price:** ${p.price}` : "",
    p.releaseDate ? `**Release Date:** ${p.releaseDate} (${p.show_date})` : "",
    p.show_regions ? `**Region:** ${p.show_regions}` : "",
    p.show_genders ? `**Gender:** ${p.show_genders}` : "",
    p.sku ? `**Style Code / SKU:** ${p.sku}` : "",
    p.collaborators ? `**Collaborators:** ${p.collaborators}` : "",
    ``,
    `Find release dates, retail links, and where to buy the ${title} at [KicksFinder](${url}).`,
  ].filter(Boolean);
  return lines.join("\n");
}

async function fetchPage(page: number): Promise<{ products: KFProduct[]; totalPages: number }> {
  const url = `${API_BASE}/products?page=${page}&limit=${PER_PAGE}&field=&sort=DESC`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  const json = await res.json();
  const inner = json?.result?.data;
  return {
    products: inner?.data ?? [],
    totalPages: inner?.meta?.pages ?? 1,
  };
}

async function fetchRecent(): Promise<KFProduct[]> {
  const res = await fetch(`${API_BASE}/recently-added`);
  const json = await res.json();
  return json?.result?.data ?? [];
}

async function upsertBatch(products: KFProduct[]) {
  const rows = products.map(p => ({
    slug: p.slug,
    publisher_id: PUBLISHER_ID,
    title: [p.product_name.trim(), p.product_nickname?.trim()].filter(Boolean).join(" — "),
    url: `${KF_BASE}/${p.slug}`,
    content: buildContent(p),
    scraped_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("articles").upsert(rows, { onConflict: "slug" });
  if (error) throw new Error(`Supabase upsert error: ${error.message}`);
  await pingRevalidate();
  return rows.length;
}

async function main() {
  if (RECENT_ONLY) {
    console.log("Fetching recently added products...");
    const products = await fetchRecent();
    const count = await upsertBatch(products as any);
    console.log(`Done — upserted ${count} recently added products.`);
    return;
  }

  // Full paginated scrape
  const { totalPages: total } = await fetchPage(1);
  const pagesToFetch = Math.min(total, isFinite(MAX_PAGES) ? MAX_PAGES : total);
  console.log(`Total pages available: ${total} (${total * PER_PAGE} products)`);
  console.log(`Fetching: ${pagesToFetch} pages (${pagesToFetch * PER_PAGE} products)\n`);

  let upserted = 0;
  let errors = 0;

  for (let page = 1; page <= pagesToFetch; page++) {
    try {
      const { products } = await fetchPage(page);
      const count = await upsertBatch(products);
      upserted += count;
      process.stdout.write(`\r  Page ${page}/${pagesToFetch} — ${upserted} products upserted`);
      if (BATCH_DELAY_MS > 0 && page < pagesToFetch) await Bun.sleep(BATCH_DELAY_MS);
    } catch (err) {
      errors++;
      console.error(`\n  ERROR page ${page}:`, err);
    }
  }

  console.log(`\n\n=== Done ===`);
  console.log(`Pages fetched: ${pagesToFetch} | Products upserted: ${upserted} | Errors: ${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
