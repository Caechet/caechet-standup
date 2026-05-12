// pages/api/job-results.js
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const CACHE_KEY = "caechet:job-results";

export default async function handler(req, res) {

  // ── POST: Make.com saves results ──────────────────────────────────────────
  if (req.method === "POST") {
    const makeToken = req.headers["x-make-token"];
    if (makeToken !== process.env.MAKE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const body = req.body;
      let jobs = [];

      // body.jobs is the text content from Anthropic — extract the JSON
      const raw = typeof body.jobs === "string"
        ? body.jobs
        : JSON.stringify(body.jobs || "");

      // Strip markdown fences and find the JSON object
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const start = cleaned.indexOf("{");

      if (start !== -1) {
        try {
          const parsed = JSON.parse(cleaned.slice(start));
          jobs = parsed.jobs || [];
        } catch {
          // Try salvaging individual job objects
          const re = /\{[^{}]*"title"[^{}]*\}/g;
          let m;
          while ((m = re.exec(cleaned)) !== null) {
            try { jobs.push(JSON.parse(m[0])); } catch {}
          }
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
