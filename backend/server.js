// server.js

require("dotenv").config();
const app = require("./src/app");
const sequelize = require("./src/config/database");

// OPTIONAL: run scraper on startup
const scrapeRSS = require("./src/scrappers/rss.scrapper");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Sync models (for small projects ok)
    await sequelize.sync();
    console.log("✅ Tables ready");

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // OPTIONAL: run scraper once on startup
    // comment if you don’t want automatic scraping
    scrapeRSS();
  } catch (err) {
    console.error("❌ Server failed to start:", err.message);
  }
}

startServer();
