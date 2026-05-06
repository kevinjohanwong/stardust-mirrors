import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublisher } from "@/lib/publishers";
import { getArticlesByReleaseDate } from "@/lib/supabase";

export const revalidate = 3600;

interface Props {
  params: Promise<{ date: string }>;
}

function getArticleSlug(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

export async function generateMetadata({ params }: Props) {
  const { date } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);
  return {
    title: `Sneaker Releases — ${date} | ${publisher?.name ?? "KicksFinder"}`,
    description: `All sneaker releases dropping on ${date}. Release dates, retail prices, and where to buy.`,
  };
}

export default async function ReleaseDatePage({ params }: Props) {
  const { date } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  if (!publisher) return notFound();

  const articles = await getArticlesByReleaseDate(publisher.publisherId, date);

  return (
    <main>
      <h1>Sneaker Releases — {date}</h1>
      <p>
        {articles.length} release{articles.length !== 1 ? "s" : ""} dropping on {date}.
      </p>

      {articles.length === 0 ? (
        <p>No releases found for {date}.</p>
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
