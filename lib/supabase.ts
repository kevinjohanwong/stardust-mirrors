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

export async function getArticlesByBrand(
  publisherId: string,
  brand: string,
  limit = 50
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, content, created_at, scraped_at, publisher_id")
    .eq("publisher_id", publisherId)
    .ilike("content", `%**Brand:** ${brand}%`)
    .order("created_at", { ascending: false })
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
  limit = 50
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, content, created_at, scraped_at, publisher_id")
    .eq("publisher_id", publisherId)
    .ilike("content", `%**Release Date:** ${date}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getArticlesByReleaseDate error:", error.message);
    return [];
  }
  return data || [];
}

export async function getDistinctBrands(publisherId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("content")
    .eq("publisher_id", publisherId)
    .limit(5000);

  if (error || !data) return [];

  const brandSet = new Set<string>();
  for (const row of data) {
    const m = row.content?.match(/\*\*Brand:\*\* (.+)/);
    if (m?.[1]) brandSet.add(m[1].trim());
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
