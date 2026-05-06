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
    title: `Sneaker Release Date ${date} — Prices, SKUs & Where to Buy | ${publisher?.name ?? "KicksFinder"}`,
    description: `All sneaker releases dropping on ${date}. Retail prices, style codes, and where to buy for every sneaker releasing this day.`,
  };
}

export default async function ReleaseDatePage({ params }: Props) {
  const { date } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  if (!publisher) return notFound();

  const articles = await getArticlesByReleaseDate(publisher.publisherId, date);

  // Group by brand for easier scanning
  const byBrand = new Map<string, typeof articles>();
  for (const a of articles) {
    const b = a.brand || "Other";
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b)!.push(a);
  }
  const brands = Array.from(byBrand.keys()).sort();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <p style={{ color: "#888", marginBottom: 4 }}>
        <a href="/" style={{ color: "#888" }}>All releases</a> › Release date {date}
      </p>
      <h1 style={{ margin: "8px 0 4px" }}>Sneaker Releases — {date}</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        {articles.length} sneaker{articles.length !== 1 ? "s" : ""} releasing on {date} — retail prices, style codes, and where to buy.
        Data sourced from <a href="https://kicksfinder.com" rel="nofollow noopener">KicksFinder</a>.
      </p>

      {articles.length === 0 ? (
        <p>No releases found for {date}.</p>
      ) : brands.length === 1 ? (
        <ReleaseTable articles={articles} />
      ) : (
        brands.map(b => (
          <section key={b} style={{ marginBottom: 32 }}>
            <h2 style={{ borderBottom: "2px solid #eee", paddingBottom: 8, marginBottom: 12 }}>
              {b} ({byBrand.get(b)!.length})
            </h2>
            <ReleaseTable articles={byBrand.get(b)!} />
          </section>
        ))
      )}

      <p style={{ marginTop: 32, color: "#888", fontSize: 13 }}>
        <a href="/">← All releases</a>
      </p>
    </main>
  );
}

function ReleaseTable({ articles }: { articles: Awaited<ReturnType<typeof getArticlesByReleaseDate>> }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={th}>Sneaker</th>
            <th style={th}>SKU / Style Code</th>
            <th style={th}>Retail Price</th>
            <th style={th}>Gender</th>
            <th style={th}>Region</th>
            <th style={th}>Source</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a, i) => (
            <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", verticalAlign: "top" }}>
              <td style={td}>
                <a href={`/${getArticleSlug(a.url)}`} style={{ fontWeight: 500, color: "#1a1a1a" }}>
                  {a.title}
                </a>
                {a.model_name && <div style={{ color: "#888", fontSize: 12 }}>{a.model_name}</div>}
                {a.collaborators && <div style={{ color: "#888", fontSize: 12 }}>ft. {a.collaborators}</div>}
              </td>
              <td style={td}>{a.sku || "—"}</td>
              <td style={td}>{a.price ? `$${a.price}` : "—"}</td>
              <td style={td}>{a.genders || "—"}</td>
              <td style={td}>{a.regions || "—"}</td>
              <td style={td}>
                <a href={a.url} rel="nofollow noopener" target="_blank" style={{ color: "#888", fontSize: 12 }}>
                  KicksFinder ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  fontWeight: 600,
  fontSize: 13,
  borderBottom: "1px solid #ddd",
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #eee",
  fontSize: 14,
};
