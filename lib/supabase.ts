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
  // Slug is the last path segment of the original URL
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, url, content, created_at, publisher_id")
    .eq("publisher_id", publisherId)
    .ilike("url", `%/${slug}%`)
    .maybeSingle();

  if (error) {
    console.error("getArticleBySlug error:", error.message);
    return null;
  }
  return data;
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
