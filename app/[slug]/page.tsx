import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getPublisher, generateSessionRef, buildWhatsAppLink } from "@/lib/publishers";
import { getArticleBySlug } from "@/lib/supabase";

export const revalidate = 3600;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0];
}

// Extract plain text excerpt from markdown content
function getExcerpt(content: string, maxChars = 300): string {
  return content
    .replace(/#{1,6}\s+/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim()
    .slice(0, maxChars);
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);
  if (!publisher) return {};
  const article = await getArticleBySlug(publisher.publisherId, slug);
  if (!article) return {};
  const excerpt = getExcerpt(article.content, 160);
  return {
    title: `${article.title} | ${publisher.name}`,
    description: excerpt,
    alternates: { canonical: article.url },
    openGraph: { title: article.title, description: excerpt, url: article.url },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const publisher = getPublisher(host);

  if (!publisher) return notFound();

  // Reconstruct the full slug (Next.js only gives us the last segment — handle nested paths)
  const article = await getArticleBySlug(publisher.publisherId, slug);

  if (!article) return notFound();

  const sessionRef = generateSessionRef(publisher.whatsappContext, article.title);
  const waLink = buildWhatsAppLink(publisher, sessionRef);
  const excerpt = getExcerpt(article.content);

  return (
    <>
      {/* Schema.org JSON-LD — article entity with full metadata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": publisher.entityType,
            headline: article.title,
            datePublished: article.scraped_at ?? article.created_at,
            dateModified: article.scraped_at ?? article.created_at,
            description: excerpt,
            url: article.url,
            isPartOf: {
              "@type": "WebSite",
              name: publisher.name,
              url: publisher.realUrl,
            },
            publisher: {
              "@type": "Organization",
              name: publisher.name,
              url: publisher.realUrl,
            },
            // sameAs points back to the canonical article on the real site
            sameAs: [article.url],
          }),
        }}
      />

      <article>
        <header>
          <h1>{article.title}</h1>
          <time dateTime={article.scraped_at ?? article.created_at}>
            Published: {formatDate(article.scraped_at ?? article.created_at)}
          </time>
          {" · "}
          <a href={article.url} rel="canonical">
            Original source →
          </a>
        </header>

        <hr />

        {/* Clean Markdown content — no ads, no tracking, no nav clutter */}
        <section
          dangerouslySetInnerHTML={{ __html: marked.parse(article.content) as string }}
        />

        <hr />

        {/* WhatsApp CTA with article-specific session context */}
        <section>
          <h2>Questions about this article?</h2>
          <p>
            Talk to a {publisher.name} expert on WhatsApp — they already have
            the context of what you&apos;re reading:{" "}
            <a href={waLink}>Chat on WhatsApp →</a>
          </p>
        </section>
      </article>
    </>
  );
}
