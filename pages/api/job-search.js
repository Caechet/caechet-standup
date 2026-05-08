// pages/api/job-search.js
// Proxies Claude API calls server-side so ANTHROPIC_API_KEY never touches the browser.
// Also used as the Make.com webhook endpoint for automated scheduled searches.

export default async function handler(req, res) {
  // ── auth check (same cookie pattern as your standup) ─────────────────────
  const cookie = req.headers.cookie || "";
  const makeToken = req.headers["x-make-token"]; // for Make.com webhook calls
  const isAuthed = cookie.includes("caechet_auth=1") || makeToken === process.env.MAKE_WEBHOOK_SECRET;

  if (!isAuthed) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { system, userMsg, useSearch = false } = req.body;

  if (!system || !userMsg) {
    return res.status(400).json({ error: "Missing system or userMsg" });
  }

  try {
    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
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

    const data = await claudeRes.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // extract text blocks and parse JSON
    const allText = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    if (!allText.trim()) {
      return res.status(500).json({ error: "Empty response from Claude" });
    }

    const cleaned = allText.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    if (start === -1) {
      return res.status(500).json({ error: "No JSON in response", raw: allText.slice(0, 200) });
    }

    const jsonStr = cleaned.slice(start);

    try {
      const parsed = JSON.parse(jsonStr);
      return res.status(200).json(parsed);
    } catch {
      // salvage partial jobs array if truncated
      const hits = [];
      const re = /\{[^{}]*"title"[^{}]*\}/g;
      let m;
      while ((m = re.exec(jsonStr)) !== null) {
        try { hits.push(JSON.parse(m[0])); } catch {}
      }
      if (hits.length > 0) {
        return res.status(200).json({ jobs: hits, total: hits.length, query: "", partial: true });
      }
      return res.status(500).json({ error: "Malformed JSON", raw: allText.slice(0, 200) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
