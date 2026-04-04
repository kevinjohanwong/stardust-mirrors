import { headers } from "next/headers";
import { getPublisher, generateSessionRef, buildWhatsAppLink } from "@/lib/publishers";
import { getArticlesByPublisher } from "@/lib/supabase";

export const revalidate = 3600; // ISR: revalidate every hour

function urlToSlug(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\/|\/$/g, "");
  } catch {
    return url;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}

export default async function HomePage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  if (!publisher) {
    return <p>Publisher not configured for this domain.</p>;
  }

  const articles = await getArticlesByPublisher(publisher.publisherId, 100);
  const sessionRef = generateSessionRef(publisher.whatsappContext);
  const waLink = buildWhatsAppLink(publisher, sessionRef);

  return (
    <>
      {/* Schema.org JSON-LD — website entity */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: publisher.name,
            url: publisher.realUrl,
            description: publisher.description,
            sameAs: [publisher.realUrl],
          }),
        }}
      />

      <main>
        <h1>{publisher.name} — AI Content Index</h1>
        <p>{publisher.description}</p>

        {/* WhatsApp CTA — surfaces in LLM citations */}
        <section>
          <h2>Get expert answers</h2>
          <p>
            Talk to a {publisher.name} expert on WhatsApp:{" "}
            <a href={waLink}>Chat on WhatsApp →</a>
          </p>
        </section>

        <hr />

        <section>
          <h2>Recent articles ({articles.length})</h2>
          <ul>
            {articles.map((article) => (
              <li key={article.id}>
                <a href={`/${urlToSlug(article.url)}`}>{article.title}</a>{" "}
                <time dateTime={article.created_at}>
                  ({formatDate(article.created_at)})
                </time>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
