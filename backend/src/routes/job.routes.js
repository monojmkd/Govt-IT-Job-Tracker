const express = require("express");
const router = express.Router();
const Job = require("../models/job.model");

router.get("/", async (req, res) => {
  try {
    const jobs = await Job.findAll({
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
