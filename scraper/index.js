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
  "https://feedproxy.google.com/sarkari-naukri",
];

const TITLE_KEYWORDS = [
  "computer",
  "software",
  "developer",
  "programmer",
  "data entry",
  "b.tech",
  "information technology",
  "system admin",
  "network",
  "cyber",
  "database",
  "web developer",
  "technical",
  "tech support",
  "hardware",
  "helpdesk",
  // Bank/PSU IT roles
  "specialist officer",
  "it officer",
  "data scientist",
  "data engineer",
  "cloud",
  "devops",
  "devsecops",
  "linux",
  "java developer",
  "android developer",
  "ios developer",
  "mobile developer",
];

const TITLE_SKIP = ["gate", "contractual", "apprentice"];

// Keywords to check in page body when title doesn't match
// Broader than title keywords — catches "Various Posts" / "Specialist Officer" type titles
const BODY_IT_KEYWORDS = [
  "engineer",
  "systems",
  "b-tech",
  "software developer",
  "software engineer",
  "web developer",
  "mobile developer",
  "android developer",
  "ios developer",
  "java developer",
  ".net developer",
  "database administrator",
  "dba",
  "network administrator",
  "network engineer",
  "system administrator",
  "cloud engineer",
  "cloud architect",
  "devops engineer",
  "devsecops",
  "data scientist",
  "data engineer",
  "data analyst",
  "bi developer",
  "cybersecurity",
  "cyber security",
  "information security",
  "it officer",
  "it department",
  "it specialist",
  "it manager",
  "it infrastructure",
  "linux administrator",
  "windows administrator",
  "storage administrator",
  "computer science",
  "information technology",
  "b.tech",
  "b.e.",
  "mca",
  "cse",
  "programming",
  "python",
  "java",
  "c++",
];

// Experience patterns to detect in page body — skip if found
// Matches: "2 years", "3+ years", "five years experience", "minimum 2 years" etc.
const EXPERIENCE_REGEX = /(\d+)\s*\+?\s*years?\s*(of\s*)?(experience|exp)/gi;
const EXPERIENCE_WORDS = [
  "2 years",
  "3 years",
  "4 years",
  "5 years",
  "6 years",
  "7 years",
  "two years",
  "three years",
  "four years",
  "five years",
  "minimum 2",
  "minimum 3",
  "minimum 4",
  "minimum 5",
  "at least 2",
  "at least 3",
  "2+ years",
  "3+ years",
  "4+ years",
];

// ── Helpers ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wrap short/ambiguous keywords in word boundary regex
const WORD_BOUNDARY_KEYWORDS = [
  "\bit\b", // "IT" as standalone word — won't match "IIT" or "digital"
  "\bi\.t\b", // "I.T" standalone
  "\bcse\b", // "CSE" standalone
  "\bmca\b", // "MCA" standalone
];

function titleIsRelevant(title) {
  const lower = title.toLowerCase();
  if (TITLE_SKIP.some((k) => lower.includes(k))) return false;
  // Check plain keywords
  if (TITLE_KEYWORDS.some((k) => lower.includes(k))) return true;
  // Check word-boundary keywords (won't false-match inside other words)
  if (WORD_BOUNDARY_KEYWORDS.some((pattern) => new RegExp(pattern).test(lower)))
    return true;
  return false;
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

function hasExcessiveExperience(text) {
  const lower = text.toLowerCase();
  // Check plain keyword phrases
  if (EXPERIENCE_WORDS.some((k) => lower.includes(k))) return true;
  // Check patterns like "2 years experience", "3+ yrs exp"
  const matches = [
    ...lower.matchAll(/(\d+)\s*\+?\s*years?\s*(of\s*)?(experience|exp)/g),
  ];
  return matches.some((m) => parseInt(m[1]) >= 2);
}

async function fetchPageInfo(url) {
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    const $ = cheerio.load(res.data);
    const bodyText = $("body").text();
    const lower = bodyText.toLowerCase();
    const date = extractLastDate(bodyText);
    const tooMuchExp = hasExcessiveExperience(bodyText);
    // Check if body contains IT-related keywords (fallback for generic titles)
    const bodyHasIT = BODY_IT_KEYWORDS.some((k) => lower.includes(k));
    return {
      lastDate: date ? date.toISOString().split("T")[0] : null,
      skip: tooMuchExp,
      bodyHasIT,
    };
  } catch {
    return { lastDate: null, skip: false, bodyHasIT: false };
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

      const titleMatch = titleIsRelevant(item.title);

      if (!titleMatch) {
        // Title didn't match — fetch page body as fallback check
        console.log(`   🔍 Title no match, checking page: ${item.title}`);
        const { lastDate, skip, bodyHasIT } = await fetchPageInfo(item.link);
        if (!bodyHasIT) {
          console.log(`   ⏭️  Skip (no IT content in page): ${item.title}`);
          totalSkipped++;
          await sleep(1500);
          continue;
        }
        if (skip) {
          console.log(`   🚫 Skip (2+ yrs exp required): ${item.title}`);
          totalSkipped++;
          await sleep(1500);
          continue;
        }
        console.log(`   ✅ Body match: ${item.title}`);
        if (lastDate) console.log(`      📅 ${lastDate}`);
        // Fall through to save
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
        continue;
      }

      console.log(`   ✅ Title match: ${item.title}`);
      const { lastDate, skip } = await fetchPageInfo(item.link);
      if (skip) {
        console.log(`   🚫 Skip (2+ yrs exp required): ${item.title}`);
        totalSkipped++;
        continue;
      }
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
