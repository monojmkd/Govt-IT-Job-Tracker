// rss.scrapper.js

const Parser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");
const Job = require("../models/job.model");

const parser = new Parser();

const RSS_URLS = [
  "https://www.mysarkarinaukri.com/rss.xml",
  "https://assam.20govt.com/feed/",
];

// -------- SETTINGS --------
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
  "Contractual",
];

// -------- HELPERS --------

async function cleanupOldJobs() {
  try {
    console.log("🧹 Cleaning old/irrelevant jobs...");

    const jobs = await Job.findAll();
    let deleted = 0;

    for (const job of jobs) {
      // Delete not relevant jobs
      if (job.isRelevant === false) {
        await job.destroy();
        deleted++;
        continue;
      }

      // Delete expired jobs
      if (job.lastDate) {
        const lastDate = new Date(job.lastDate);
        const today = new Date();

        if (!isNaN(lastDate) && lastDate < today) {
          await job.destroy();
          deleted++;
        }
      }
    }

    console.log(`🗑️ Deleted ${deleted} old jobs.`);
  } catch (err) {
    console.error("Cleanup failed:", err.message);
  }
}

function textContains(text, keywords) {
  text = text.toLowerCase();
  return keywords.some((k) => text.includes(k));
}

function extractLastDate(text) {
  // Matches formats like 12 March 2026 / 12-03-2026 / 12/03/2026
  const regex =
    /(\d{1,2}[\s\/-](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})[\s\/-]\d{2,4})/gi;

  const match = text.match(regex);
  if (!match) return null;

  const date = new Date(match[0]);
  if (isNaN(date)) return null;

  return date;
}

function isExpired(date) {
  if (!date) return false;
  const today = new Date();
  return date < today;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------- PAGE CHECK --------
async function checkJobPage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    const $ = cheerio.load(res.data);
    const bodyText = $("body").text().toLowerCase();

    // Skip expired jobs
    const lastDate = extractLastDate(bodyText);
    if (isExpired(lastDate)) {
      console.log("⏳ Skipping expired job:", url);
      return { valid: false };
    }

    // Skip GATE / 65% jobs
    if (textContains(bodyText, SKIP_KEYWORDS)) return { valid: false };

    // Check IT keywords
    if (!textContains(bodyText, IT_KEYWORDS)) return { valid: false };

    return {
      valid: true,
      lastDate: lastDate ? lastDate.toISOString().split("T")[0] : null,
    };
  } catch (err) {
    console.log("⚠️ Page check failed:", url);
    return { valid: false };
  }
}

// -------- MAIN SCRAPER --------
async function scrapeRSS() {
  try {
    await cleanupOldJobs();

    let totalSaved = 0;

    for (const url of RSS_URLS) {
      try {
        console.log("📡 Fetching RSS:", url);

        const feed = await parser.parseURL(url);

        for (let item of feed.items) {
          if (!item.link) continue;

          const result = await checkJobPage(item.link);
          if (!result.valid) continue;

          const [job, created] = await Job.findOrCreate({
            where: { link: item.link },
            defaults: {
              title: item.title || "No title",
              organization: "Various Govt",
              source: url,
              lastDate: result.lastDate,
              isRelevant: true,
            },
          });

          if (created) {
            totalSaved++;
            console.log("✅ Saved:", item.title);
          }

          await sleep(2000);
        }
      } catch (err) {
        console.log("⚠️ Failed RSS:", url);
      }
    }

    console.log(`🎉 Done. ${totalSaved} new jobs saved.`);
  } catch (err) {
    console.error("❌ RSS scraping failed:", err.message);
  }
}

module.exports = scrapeRSS;
