const KEY = "3f281fc94cfbed06fce6e598f7bb7bcd6dbf26bcdcfb4c3ec7f073b2b75b6484";
const HOST = "kicksfinder.stardustai.co";
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;

async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL);
  const xml = await res.text();
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  return [...matches].map((m) => m[1]);
}

async function submitBatch(urls: string[]) {
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.status;
}

const urls = await fetchSitemapUrls();
console.log(`Found ${urls.length} URLs in sitemap`);

// IndexNow accepts max 10,000 URLs per request
const BATCH = 10_000;
let submitted = 0;
for (let i = 0; i < urls.length; i += BATCH) {
  const batch = urls.slice(i, i + BATCH);
  const status = await submitBatch(batch);
  submitted += batch.length;
  console.log(`Batch ${Math.ceil((i + 1) / BATCH)}: ${status} (${submitted}/${urls.length} URLs)`);
}
console.log("Done.");
