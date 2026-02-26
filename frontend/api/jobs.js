// frontend/api/jobs.js
// Vercel serverless backend — fetches from Supabase and serves to frontend.
// Runs on Vercel's servers (not the browser), so no ISP or CORS issues.

import axios from "axios";

const env = globalThis.process?.env ?? {};
const SUPABASE_URL = (env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_KEY = env.SUPABASE_ANON_KEY ?? "";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error:
        "Missing env vars — add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel dashboard",
    });
  }

  try {
    const { data } = await axios.get(`${SUPABASE_URL}/rest/v1/jobs`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      params: {
        select: "*",
        order: "created_at.desc",
        limit: 50,
      },
    });

    res.status(200).json(data);
  } catch (err) {
    console.error(
      "Supabase error:",
      err.response?.status,
      err.response?.data ?? err.message,
    );
    res.status(500).json({
      error: "Failed to fetch from Supabase",
      detail: err.response?.data ?? err.message,
    });
  }
}
