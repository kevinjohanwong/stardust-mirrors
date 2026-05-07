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
    title: `${name} Sneaker Releases — Prices, SKUs & Where to Buy | ${publisher?.name ?? "KicksFinder"}`,
    description: `Complete list of ${name} sneaker releases with retail prices, style codes, release dates, and where to buy. Updated daily.`,
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

  const upcoming = articles.filter(a => !a.is_past_release);
  const past = articles.filter(a => a.is_past_release);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <p style={{ color: "#888", marginBottom: 4 }}>
        <a href="/" style={{ color: "#888" }}>All releases</a> › {brandName}
      </p>
      <h1 style={{ margin: "8px 0 4px" }}>{brandName} Sneaker Releases</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        {articles.length} {brandName} releases tracked — prices, SKUs, and where to buy.
        Data sourced from <a href={`https://kicksfinder.com`} rel="nofollow noopener">KicksFinder</a>.
      </p>

      {articles.length === 0 ? (
        <p>No releases found for {brandName}.</p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 style={{ borderBottom: "2px solid #eee", paddingBottom: 8 }}>
                Upcoming {brandName} Releases ({upcoming.length})
              </h2>
              <ReleaseTable articles={upcoming} />
            </section>
          )}

          {past.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <h2 style={{ borderBottom: "2px solid #eee", paddingBottom: 8 }}>
                Past {brandName} Releases ({past.length})
              </h2>
              <ReleaseTable articles={past} />
            </section>
          )}
        </>
      )}

      <p style={{ marginTop: 32, color: "#888", fontSize: 13 }}>
        <a href="/">← All releases</a>
      </p>
    </main>
  );
}

function ReleaseTable({ articles }: { articles: ReturnType<typeof getArticlesByBrand> extends Promise<infer T> ? T : never }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={th}>Sneaker</th>
            <th style={th}>SKU / Style Code</th>
            <th style={th}>Retail Price</th>
            <th style={th}>Release Date</th>
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
              <td style={td}>{a.price ?? "—"}</td>
              <td style={{ ...td, whiteSpace: "nowrap" }}>{a.release_date_display || a.release_date || "TBD"}</td>
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
