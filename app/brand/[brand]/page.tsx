import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublisher } from "@/lib/publishers";
import { getArticlesByBrand } from "@/lib/supabase";

export const revalidate = 3600;

interface Props {
  params: Promise<{ brand: string }>;
}

function slugToName(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

function getArticleSlug(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

export async function generateMetadata({ params }: Props) {
  const { brand } = await params;
  const name = slugToName(brand);
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);
  return {
    title: `${name} Sneaker Releases | ${publisher?.name ?? "KicksFinder"}`,
    description: `Browse all ${name} sneaker releases, restocks, and where to buy on ${publisher?.name ?? "KicksFinder"}.`,
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand } = await params;
  const brandName = slugToName(brand);
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  if (!publisher) return notFound();

  const articles = await getArticlesByBrand(publisher.publisherId, brandName);

  return (
    <main>
      <h1>{brandName} Sneaker Releases</h1>
      <p>
        {articles.length} {brandName} releases tracked on {publisher.name}.
      </p>

      {articles.length === 0 ? (
        <p>No releases found for {brandName}.</p>
      ) : (
        <ul>
          {articles.map((a) => (
            <li key={a.id}>
              <a href={`/${getArticleSlug(a.url)}`}>{a.title}</a>
            </li>
          ))}
        </ul>
      )}

      <hr />
      <p>
        <a href="/">← All releases</a>
      </p>
    </main>
  );
}
