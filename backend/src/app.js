// app.js

const express = require("express");
const cors = require("cors");
const aiRoutes = require("./routes/ai.routes");
const jobRoutes = require("./routes/job.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Govt Job Tracker API Running");
});

app.use("/api/ai", aiRoutes);
app.use("/api/jobs", jobRoutes);

module.exports = app;
