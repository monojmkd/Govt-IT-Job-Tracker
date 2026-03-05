// scraper/index.js
// Uses Supabase REST API directly via axios — no supabase-js, no fetch issues.

const Parser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");

// ── Env check ─────────────────────────────────────────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Supabase REST via axios (no supabase-js, no fetch) ────────────────
const db = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  },
});

// ── Config ────────────────────────────────────────────────────────────
const parser = new Parser();

const RSS_URLS = [
  "https://www.mysarkarinaukri.com/rss.xml",
  "https://assam.20govt.com/feed/",
  "https://feedproxy.google.com/sarkari-naukri"
];

const TITLE_KEYWORDS = [
  "computer",
  "software",
  "it ",
  "i.t",
  "developer",
  "programmer",
  "data entry",
  "cse",
  "mca",
  "b.tech",
  "information technology",
  "system admin",
  "network",
  "cyber",
  "database",
  "web developer",
  "technical",
  "tech support",
];

const TITLE_SKIP = ["gate", "contractual", "apprentice"];

// ── Helpers ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function titleIsRelevant(title) {
  const lower = title.toLowerCase();
  if (TITLE_SKIP.some((k) => lower.includes(k))) return false;
  return TITLE_KEYWORDS.some((k) => lower.includes(k));
}

function extractLastDate(text) {
  const patterns = [
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/gi,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
  ];
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      const date = new Date(match[0]);
      if (!isNaN(date) && date.getFullYear() > 2020) return date;
    }
  }
  return null;
}

async function fetchLastDate(url) {
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    const $ = cheerio.load(res.data);
    const date = extractLastDate($("body").text());
    return date ? date.toISOString().split("T")[0] : null;
  } catch {
    return null;
  }
}

// ── Connection test ───────────────────────────────────────────────────
async function testConnection() {
  console.log("🔌 Testing Supabase connection...");
  console.log("   URL:", SUPABASE_URL);
  try {
    await db.get("/jobs", { params: { limit: 1 } });
    console.log("✅ Connected!\n");
  } catch (err) {
    console.error("❌ Connection failed:", err.response?.data ?? err.message);
    console.error("   Double-check SUPABASE_URL and SUPABASE_SERVICE_KEY");
    process.exit(1);
  }
}

// ── Cleanup expired jobs ──────────────────────────────────────────────
async function cleanup() {
  console.log("🧹 Removing expired jobs...");
  const today = new Date().toISOString().split("T")[0];
  try {
    await db.delete("/jobs", {
      params: { last_date: `lt.${today}`, "last_date.not": "is.null" },
    });
    console.log("   Done\n");
  } catch (err) {
    console.error("   Cleanup error:", err.response?.data ?? err.message);
  }
}

// ── Main ──────────────────────────────────────────────────────────────
async function scrape() {
  console.log("🚀 Scraper started at", new Date().toISOString());

  await testConnection();
  await cleanup();

  let totalChecked = 0,
    totalSkipped = 0,
    totalSaved = 0,
    totalDupes = 0;

  for (const rssUrl of RSS_URLS) {
    console.log(`📡 Fetching RSS: ${rssUrl}`);

    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
      console.log(`   Found ${feed.items.length} items`);
    } catch (err) {
      console.error(`   ❌ RSS failed: ${err.message}`);
      continue;
    }

    for (const item of feed.items) {
      if (!item.link || !item.title) continue;
      totalChecked++;

      if (!titleIsRelevant(item.title)) {
        console.log(`   ⏭️  Skip: ${item.title}`);
        totalSkipped++;
        continue;
      }

      console.log(`   ✅ Match: ${item.title}`);
      const lastDate = await fetchLastDate(item.link);
      if (lastDate) console.log(`      📅 ${lastDate}`);

      try {
        const res = await db.post(
          "/jobs",
          {
            title: item.title,
            link: item.link,
            source: rssUrl,
            last_date: lastDate,
            is_relevant: true,
          },
          {
            headers: {
              Prefer: "resolution=ignore-duplicates,return=representation",
            },
          },
        );

        if (res.data && res.data.length > 0) {
          totalSaved++;
          console.log(`      💾 Saved!`);
        } else {
          totalDupes++;
          console.log(`      ↩️  Already exists`);
        }
      } catch (err) {
        console.error(
          `      ❌ Insert error:`,
          err.response?.data ?? err.message,
        );
      }

      await sleep(1500);
    }

    console.log("");
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary
   Checked   : ${totalChecked}
   Skipped   : ${totalSkipped}
   Duplicates: ${totalDupes}
   Saved     : ${totalSaved}
━━━━━━━━━━━━━━━━━━━━━━━`);
}

scrape().catch((err) => {
  console.error("💥 Fatal:", err.message);
  process.exit(1);
});
