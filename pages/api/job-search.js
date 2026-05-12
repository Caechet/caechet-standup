// pages/api/job-search.js
export const config = { runtime: "edge", maxDuration: 120 };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async function handler(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    if (!cookie.includes("caechet_auth=1")) return json({ error: "Unauthorized" }, 401);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const { system, userMsg } = body;
    if (!system || !userMsg) return json({ error: "Missing fields" }, 400);
    if (!process.env.ANTHROPIC_API_KEY) return json({ error: "No API key" }, 500);

    // Single call — web_search is server-side, Anthropic handles it internally
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    const data = await r.json();

    if (!r.ok || data.error) {
      return json({ error: data.error?.message || `Anthropic error ${r.status}` }, 500);
    }

    // Debug — return full content block types so we can see what came back
    const content = data.content || [];
    const textBlock = content.find(b => b.type === "text");

    if (!textBlock?.text?.trim()) {
      return json({
        error: "No text in response",
        stopReason: data.stop_reason,
        contentTypes: content.map(b => b.type),
        contentCount: content.length,
      }, 500);
    }

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    if (start === -1) return json({ error: "No JSON found", raw: cleaned.slice(0, 300) }, 500);

    try {
      return json(JSON.parse(cleaned.slice(start)));
    } catch {
      const hits = [];
      const re = /\{[^{}]*"title"[^{}]*\}/g;
      let m;
      while ((m = re.exec(cleaned)) !== null) {
        try { hits.push(JSON.parse(m[0])); } catch {}
      }
      if (hits.length > 0) return json({ jobs: hits, total: hits.length, query: "" });
      return json({ error: "Malformed JSON", raw: cleaned.slice(0, 300) }, 500);
    }

  } catch (err) {
    return json({ error: err.message || "Unknown error" }, 500);
  }
}
