// pages/api/job-results.js
//
// POST — Make.com saves results (authenticated via x-make-token)
// GET  — /jobs page reads results (authenticated via cookie)
//
// Uses Upstash Redis for persistent storage across serverless instances.

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv(); // reads KV_REST_API_URL + KV_REST_API_TOKEN from env
const CACHE_KEY = "caechet:job-results";

export default async function handler(req, res) {

  // ── POST: Make.com saves results ─────────────────────────────────────────
  if (req.method === "POST") {
    const makeToken = req.headers["x-make-token"];
    if (makeToken !== process.env.MAKE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      let jobs = [];
      const body = req.body;

      if (body.jobs && Array.isArray(body.jobs)) {
        jobs = body.jobs;
      } else if (typeof body.jobs === "string") {
        const cleaned = body.jobs.replace(/```json|```/g, "").trim();
        const start = cleaned.indexOf("{");
        if (start !== -1) {
          const parsed = JSON.parse(cleaned.slice(start));
          jobs = parsed.jobs || [];
        }
      }

      jobs.sort((a, b) => {
        const da = new Date(a.postedAt), db = new Date(b.postedAt);
        if (isNaN(da) || isNaN(db)) return 0;
        return db - da;
      });

      const payload = { jobs, cachedAt: new Date().toISOString(), total: jobs.length };
      await redis.set(CACHE_KEY, JSON.stringify(payload));

      return res.status(200).json({ success: true, count: jobs.length, cachedAt: payload.cachedAt });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET: /jobs page reads results ─────────────────────────────────────────
  if (req.method === "GET") {
    const cookie = req.headers.cookie || "";
    if (!cookie.includes("caechet_auth=1")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const raw = await redis.get(CACHE_KEY);
      if (!raw) return res.status(200).json({ jobs: [], total: 0, cachedAt: null, fresh: false });
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json({ ...data, fresh: data.jobs?.length > 0 });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
