id = "test_scraper";
const scrapeRSS = require("./src/scrappers/rss.scrapper");

scrapeRSS().then(() => {
  console.log("Scraping done");
});
