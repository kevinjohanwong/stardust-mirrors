import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Article {
  id: string;
  title: string;
  url: string;
  content: string;
  created_at: string;
  scraped_at?: string;
  publisher_id: string;
  brand?: string | null;
  model_name?: string | null;
  price?: string | null;
  release_date?: string | null;
  release_date_display?: string | null;
  sku?: string | null;
  regions?: string | null;
  genders?: string | null;
  collaborators?: string | null;
  is_past_release?: boolean | null;
}

export async function getArticlesByPublisher(
  publisherId: string,
  limit = 50
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, content, created_at, publisher_id")
    .eq("publisher_id", publisherId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getArticlesByPublisher error:", error.message);
    return [];
  }
  return data || [];
}

export async function getArticleBySlug(
  publisherId: string,
  slug: string
): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, content, created_at, scraped_at, publisher_id")
    .eq("publisher_id", publisherId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getArticleBySlug error:", error.message);
    return null;
  }
  return data;
}

const ARTICLE_FIELDS = "id, title, url, content, created_at, scraped_at, publisher_id, brand, model_name, price, release_date, release_date_display, sku, regions, genders, collaborators, is_past_release";

export async function getArticlesByBrand(
  publisherId: string,
  brand: string,
  limit = 200
): Promise<Article[]> {
  // Try column query first (new data), fall back to ilike for legacy rows
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("publisher_id", publisherId)
    .ilike("brand", brand)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("getArticlesByBrand error:", error.message);
    return [];
  }
  return data || [];
}

export async function getArticlesByReleaseDate(
  publisherId: string,
  date: string,
  limit = 200
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("publisher_id", publisherId)
    .eq("release_date", date)
    .order("brand", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getArticlesByReleaseDate error:", error.message);
    return [];
  }
  return data || [];
}

export async function getUpcomingReleases(
  publisherId: string,
  daysAhead = 30,
  limit = 500
): Promise<Article[]> {
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_FIELDS)
    .eq("publisher_id", publisherId)
    .gte("release_date", today)
    .lte("release_date", future)
    .order("release_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getUpcomingReleases error:", error.message);
    return [];
  }
  return data || [];
}

export async function getDistinctBrands(publisherId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("brand")
    .eq("publisher_id", publisherId)
    .not("brand", "is", null);

  if (error || !data) return [];

  const brandSet = new Set<string>();
  for (const row of data) {
    if (row.brand) brandSet.add(row.brand.trim());
  }
  return Array.from(brandSet).sort();
}

export async function getAllArticleUrls(publisherId: string): Promise<{ url: string; created_at: string }[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("url, created_at")
    .eq("publisher_id", publisherId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllArticleUrls error:", error.message);
    return [];
  }
  return data || [];
}
