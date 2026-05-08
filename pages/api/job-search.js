// pages/api/job-search.js
// Called by the manual search bar on /jobs
// Proxies Claude API server-side so ANTHROPIC_API_KEY never touches the browser

export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("caechet_auth=1")) {
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
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
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
      return res.status(500).json({ error: "No JSON in response" });
    }

    const jsonStr = cleaned.slice(start);

    try {
      return res.status(200).json(JSON.parse(jsonStr));
    } catch {
      // salvage partial results if response was truncated
      const hits = [];
      const re = /\{[^{}]*"title"[^{}]*\}/g;
      let m;
      while ((m = re.exec(jsonStr)) !== null) {
        try { hits.push(JSON.parse(m[0])); } catch {}
      }
      if (hits.length > 0) {
        return res.status(200).json({ jobs: hits, total: hits.length, query: "", partial: true });
      }
      return res.status(500).json({ error: "Malformed JSON response" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
