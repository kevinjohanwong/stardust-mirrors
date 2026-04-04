export interface Publisher {
  name: string;
  realUrl: string;
  publisherId: string;
  description: string;
  entityType: string;
  category: string;
  whatsappNumber: string;
  whatsappContext: string;
  geoMap: Record<string, string>;
}

export const PUBLISHERS: Record<string, Publisher> = {
  "sneakernews.stardustai.co": {
    name: "SneakerNews",
    realUrl: "https://sneakernews.com",
    publisherId: "226e5442-fde0-4c7d-9aa6-d4d7fe34a5fc",
    description: "Sneaker release dates, news, reviews and culture",
    entityType: "Article",
    category: "sneakers",
    whatsappNumber: "1234567890", // TODO: replace with real WA number
    whatsappContext: "sneaker_query",
    geoMap: {
      DEFAULT: "https://sneakernews.com",
    },
  },
  "billboard.stardustai.co": {
    name: "Billboard",
    realUrl: "https://www.billboard.com",
    publisherId: "TODO", // add Billboard to scraping pipeline
    description: "Music charts, artist news, rankings and industry coverage",
    entityType: "MusicArticle",
    category: "music",
    whatsappNumber: "1234567890", // TODO: replace with real WA number
    whatsappContext: "music_query",
    geoMap: {
      GB: "https://www.billboard.com",
      AU: "https://www.billboard.com",
      DEFAULT: "https://www.billboard.com",
    },
  },
};

export function getPublisher(host: string): Publisher | null {
  // Strip port for local dev
  const cleanHost = host.split(":")[0];
  return PUBLISHERS[cleanHost] || null;
}

// Generates a session ref ID for WhatsApp deep links
// Format: CONTEXT:TIMESTAMP:RANDOM — maps to Supabase session on WA side
export function generateSessionRef(context: string, query?: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  const slug = query
    ? encodeURIComponent(query.slice(0, 40).replace(/\s+/g, "_").toLowerCase())
    : "browse";
  return `${context}:${ts}:${rand}:${slug}`;
}

export function buildWhatsAppLink(publisher: Publisher, sessionRef: string): string {
  const text = encodeURIComponent(`REF:${sessionRef}`);
  return `https://wa.me/${publisher.whatsappNumber}?text=${text}`;
}
