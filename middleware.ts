import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLISHERS } from "@/lib/publishers";

// AI crawlers we want to serve clean content to
const AI_CRAWLERS = [
  "gptbot",
  "claude-bot",
  "claudebot",
  "google-extended",
  "anthropic-ai",
  "perplexitybot",
  "applebot-extended",
  "cohere-ai",
  "diffbot",
  "imagesiftbot",
  "omgili",
];

// Traditional SEO bots we block (don't want Google indexing our mirror)
// Note: bingbot is intentionally excluded — Bing indexing feeds Perplexity discovery
const SEO_BOTS = [
  "googlebot",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "sogou",
  "facebot",
  "ia_archiver",
];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const path = request.nextUrl.pathname;

  // Always serve static/special paths directly
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/robots.txt" ||
    path === "/llms.txt" ||
    path === "/sitemap.xml" ||
    path.endsWith(".txt")
  ) {
    return NextResponse.next();
  }

  // Look up publisher config for this host
  const cleanHost = host.split(":")[0];
  const publisher = PUBLISHERS[cleanHost];

  // Unknown host — pass through (handles localhost dev)
  if (!publisher) {
    return NextResponse.next();
  }

  // AI crawlers → serve the clean mirror content
  if (AI_CRAWLERS.some((bot) => ua.includes(bot))) {
    return NextResponse.next();
  }

  // Traditional SEO bots → 403 (don't want to be indexed by Google)
  if (SEO_BOTS.some((bot) => ua.includes(bot))) {
    return new NextResponse("Access denied", { status: 403 });
  }

  // Human browser → geo-aware redirect to the real site
  const country = (request as any).geo?.country || "DEFAULT";
  const baseUrl = publisher.geoMap[country] || publisher.geoMap["DEFAULT"];

  // Preserve the original path so the redirect lands on the right article
  const redirectUrl = path === "/" ? baseUrl : `${baseUrl}${path}`;

  return NextResponse.redirect(redirectUrl, {
    status: 302,
    headers: {
      // Don't cache the redirect — geo may change
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
