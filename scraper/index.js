// scraper/index.js
// Runs on GitHub Actions every 6 hours.
// Scrapes RSS feeds, filters for relevant IT/govt jobs, saves to Supabase.

const Parser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const { createClient } = require("@supabase/supabase-js");

// ── Supabase client (uses service key — never expose this in frontend) ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const parser = new Parser();

// ── Config ───────────────────────────────────────────────────────────
const RSS_URLS = [
  "https://www.mysarkarinaukri.com/rss.xml",
  "https://assam.20govt.com/feed/",
];

const IT_KEYWORDS = [
  "computer science",
  "information technology",
  "b.tech it",
  "it officer",
  "software",
  "programmer",
  "cse",
  "mca",
  "developer",
];

const SKIP_KEYWORDS = [
  "gate",
  "65%",
  "first class",
  "minimum 65%",
  "contractual",
];

// ── Helpers ──────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function textContains(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function extractLastDate(text) {
  const regex =
    /(\d{1,2}[\s\/-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})[\s\/-]\d{2,4})/gi;
  const match = text.match(regex);
  if (!match) return null;
  const date = new Date(match[0]);
  return isNaN(date) ? null : date;
}

function isExpired(date) {
  return date ? date < new Date() : false;
}

// ── Page checker ─────────────────────────────────────────────────────
async function checkJobPage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    const $ = cheerio.load(res.data);
    const bodyText = $("body").text();

    const lastDate = extractLastDate(bodyText);
    if (isExpired(lastDate)) {
      console.log("⏳ Expired, skipping:", url);
      return { valid: false };
    }

    if (textContains(bodyText, SKIP_KEYWORDS)) return { valid: false };
    if (!textContains(bodyText, IT_KEYWORDS)) return { valid: false };

    return {
      valid: true,
      lastDate: lastDate ? lastDate.toISOString().split("T")[0] : null,
    };
  } catch {
    return { valid: false };
  }
}

// ── Cleanup expired/irrelevant jobs from Supabase ────────────────────
async function cleanup() {
  console.log("🧹 Cleaning up old jobs...");

  // Delete expired jobs (lastDate is in the past)
  const today = new Date().toISOString().split("T")[0];
  const { error: e1 } = await supabase
    .from("jobs")
    .delete()
    .lt("last_date", today)
    .not("last_date", "is", null);

  if (e1) console.error("Cleanup error:", e1.message);
  else console.log("✅ Expired jobs removed");
}

// ── Main scraper ─────────────────────────────────────────────────────
async function scrape() {
  console.log("🚀 Starting scraper at", new Date().toISOString());

  await cleanup();

  let totalSaved = 0;

  for (const rssUrl of RSS_URLS) {
    console.log("📡 Fetching RSS:", rssUrl);

    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (err) {
      console.log("⚠️ Failed to fetch RSS:", rssUrl, err.message);
      continue;
    }

    for (const item of feed.items) {
      if (!item.link) continue;

      const result = await checkJobPage(item.link);
      if (!result.valid) continue;

      // Upsert: insert if not exists, ignore if already saved (based on link)
      const { error } = await supabase.from("jobs").upsert(
        {
          title: item.title || "No title",
          link: item.link,
          source: rssUrl,
          last_date: result.lastDate,
          is_relevant: true,
        },
        { onConflict: "link", ignoreDuplicates: true },
      );

      if (error) {
        console.error("Insert error:", error.message);
      } else {
        totalSaved++;
        console.log("✅ Saved:", item.title);
      }

      await sleep(2000); // be polite to the sites
    }
  }

  console.log(`🎉 Done. ${totalSaved} new jobs saved.`);
}

scrape().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
