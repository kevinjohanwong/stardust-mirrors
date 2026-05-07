import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPublisher } from "@/lib/publishers";
import { getUpcomingReleases } from "@/lib/supabase";

export const revalidate = 3600;

function getArticleSlug(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}

export async function generateMetadata() {
  return {
    title: "Upcoming Sneaker Releases — Next 30 Days | KicksFinder",
    description: "Complete list of sneaker releases dropping in the next 30 days. Retail prices, SKUs, release dates, and where to buy.",
  };
}

export default async function UpcomingPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  if (!publisher) return notFound();

  const articles = await getUpcomingReleases(publisher.publisherId, 30);

  // Group by release date
  const byDate = new Map<string, typeof articles>();
  for (const a of articles) {
    const d = a.release_date || "TBD";
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(a);
  }
  const dates = Array.from(byDate.keys()).sort();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <p style={{ color: "#888", marginBottom: 4 }}>
        <a href="/" style={{ color: "#888" }}>All releases</a> › Upcoming
      </p>
      <h1 style={{ margin: "8px 0 4px" }}>Upcoming Sneaker Releases</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        {articles.length} sneaker{articles.length !== 1 ? "s" : ""} dropping in the next 30 days.
        Retail prices, SKUs, and where to buy. Updated daily from <a href="https://kicksfinder.com" rel="nofollow noopener">KicksFinder</a>.
      </p>

      {articles.length === 0 ? (
        <p>No upcoming releases found.</p>
      ) : (
        dates.map(d => (
          <section key={d} style={{ marginBottom: 36 }}>
            <h2 style={{ borderBottom: "2px solid #eee", paddingBottom: 8, marginBottom: 12 }}>
              <a href={`/release/${d}`} style={{ color: "#1a1a1a", textDecoration: "none" }}>
                {byDate.get(d)![0]?.release_date_display || d}
              </a>
              <span style={{ color: "#888", fontWeight: 400, fontSize: 16, marginLeft: 8 }}>
                ({byDate.get(d)!.length} release{byDate.get(d)!.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                    <th style={th}>Sneaker</th>
                    <th style={th}>Brand</th>
                    <th style={th}>SKU</th>
                    <th style={th}>Price</th>
                    <th style={th}>Region</th>
                    <th style={th}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {byDate.get(d)!.map((a, i) => (
                    <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", verticalAlign: "top" }}>
                      <td style={td}>
                        <a href={`/${getArticleSlug(a.url)}`} style={{ fontWeight: 500, color: "#1a1a1a" }}>
                          {a.title}
                        </a>
                        {a.collaborators && <div style={{ color: "#888", fontSize: 12 }}>ft. {a.collaborators}</div>}
                      </td>
                      <td style={td}>
                        {a.brand
                          ? <a href={`/brand/${encodeURIComponent(a.brand.toLowerCase().replace(/ /g, "-"))}`}>{a.brand}</a>
                          : "—"}
                      </td>
                      <td style={td}>{a.sku || "—"}</td>
                      <td style={td}>{a.price ?? "—"}</td>
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
          </section>
        ))
      )}

      <p style={{ marginTop: 32, color: "#888", fontSize: 13 }}>
        <a href="/">← All releases</a>
      </p>
    </main>
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
