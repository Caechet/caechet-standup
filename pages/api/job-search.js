// pages/api/job-search.js
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // always respond — never let the function die silently
  try {
    const cookie = req.headers.cookie || "";
    if (!cookie.includes("caechet_auth=1")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { system, userMsg, useSearch = false } = req.body || {};
    if (!system || !userMsg) {
      return res.status(400).json({ error: "Missing system or userMsg" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
    }

    const body = {
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: userMsg }],
    };

    if (useSearch) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return res.status(500).json({ error: `Anthropic error ${claudeRes.status}: ${errText.slice(0, 200)}` });
    }

    const data = await claudeRes.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || JSON.stringify(data.error) });
    }

    const allText = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    if (!allText.trim()) {
      return res.status(500).json({ error: "Empty response from Claude", raw: JSON.stringify(data).slice(0, 300) });
    }

    const cleaned = allText.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    if (start === -1) {
      return res.status(500).json({ error: "No JSON found", raw: allText.slice(0, 200) });
    }

    try {
      return res.status(200).json(JSON.parse(cleaned.slice(start)));
    } catch {
      const hits = [];
      const re = /\{[^{}]*"title"[^{}]*\}/g;
      let m;
      while ((m = re.exec(cleaned)) !== null) {
        try { hits.push(JSON.parse(m[0])); } catch {}
      }
      if (hits.length > 0) {
        return res.status(200).json({ jobs: hits, total: hits.length, query: "", partial: true });
      }
      return res.status(500).json({ error: "Malformed JSON", raw: allText.slice(0, 200) });
    }

  } catch (err) {
    // catch-all — always return JSON so browser never sees "Failed to fetch"
    return res.status(500).json({ error: err.message || "Unknown server error" });
  }
}
