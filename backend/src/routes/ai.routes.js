const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/ai/match
router.post("/match", async (req, res) => {
  try {
    const { jobs = [], query = "" } = req.body;

    if (!jobs.length) {
      return res.status(400).json({ error: "No jobs provided" });
    }

    // Limit jobs to avoid hitting free quota
    const safeJobs = jobs.slice(0, 80).map((j) => ({
      id: j.id,
      title: j.title,
      link: j.link,
    }));

    const prompt = `
You are a Government IT Job Expert.

User request: "${query || "Find best IT jobs"}"

Rank jobs based on relevance to software engineering roles.

Return ONLY valid JSON in this format:
{
 "summary": "one sentence",
 "matches": [
   { "id": "job id", "title": "...", "reason": "...", "score": 0-100 }
 ]
}

Jobs:
${JSON.stringify(safeJobs, null, 2)}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Clean markdown
    text = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: text,
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({
      error: "AI matching failed",
      details: error.message,
    });
  }
});

module.exports = router;
