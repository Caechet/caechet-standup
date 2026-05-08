// pages/api/job-results.js
//
// POST — Make.com calls this to save the latest job results (authenticated via x-make-token)
// GET  — The /jobs page calls this on load to retrieve stored results

// Simple in-memory store for serverless (persists within the same instance).
// For production persistence across instances, swap this with your existing
// shared-storage pattern or a KV store like Vercel KV / Upstash Redis.
let cachedJobs = [];
let cachedAt = null;

export default async function handler(req, res) {

  // ── POST: Make.com saves results ─────────────────────────────────────────
  if (req.method === "POST") {
    const makeToken = req.headers["x-make-token"];
    if (makeToken !== process.env.MAKE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      let jobs = [];

      // Make sends the raw text from Anthropic — parse it
      const body = req.body;

      if (body.jobs && Array.isArray(body.jobs)) {
        // Already parsed array
        jobs = body.jobs;
      } else if (typeof body.jobs === "string") {
        // Raw JSON string — strip and parse
        const cleaned = body.jobs.replace(/```json|```/g, "").trim();
        const start = cleaned.indexOf("{");
        if (start !== -1) {
          const parsed = JSON.parse(cleaned.slice(start));
          jobs = parsed.jobs || [];
        }
      }

      // Sort newest first
      jobs.sort((a, b) => {
        const da = new Date(a.postedAt), db = new Date(b.postedAt);
        if (isNaN(da) || isNaN(db)) return 0;
        return db - da;
      });

      cachedJobs = jobs;
      cachedAt = new Date().toISOString();

      return res.status(200).json({ success: true, count: jobs.length, cachedAt });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET: jobs page reads results ──────────────────────────────────────────
  if (req.method === "GET") {
    const cookie = req.headers.cookie || "";
    if (!cookie.includes("caechet_auth=1")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.status(200).json({
      jobs: cachedJobs,
      total: cachedJobs.length,
      cachedAt,
      fresh: cachedJobs.length > 0,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
