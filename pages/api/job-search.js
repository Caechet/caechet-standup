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

    const { system, userMsg, useSearch = false } = body;
    if (!system || !userMsg) return json({ error: "Missing fields" }, 400);
    if (!process.env.ANTHROPIC_API_KEY) return json({ error: "No API key" }, 500);

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    };

    // Build messages array — start with the user message
    let messages = [{ role: "user", content: userMsg }];
    const tools = useSearch ? [{ type: "web_search_20250305", name: "web_search" }] : [];
    let finalText = "";

    // Loop up to 8 turns to handle web search tool calls
    for (let i = 0; i < 8; i++) {
      const payload = {
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system,
        messages,
      };
      if (tools.length) payload.tools = tools;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await r.json();

      if (!r.ok || data.error) {
        return json({ error: data.error?.message || `Anthropic error ${r.status}` }, 500);
      }

      const content = data.content || [];

      // Check for text block first
      const textBlock = content.find(b => b.type === "text");
      if (textBlock?.text?.trim()) {
        finalText = textBlock.text;
        break;
      }

      // If stop reason is tool_use, collect tool results and continue
      if (data.stop_reason === "tool_use") {
        const toolUseBlocks = content.filter(b => b.type === "tool_use");
        const toolResultBlocks = content.filter(b => b.type === "tool_result");

        // Add assistant turn
        messages = [...messages, { role: "assistant", content }];

        // Build tool results for next user turn
        const results = toolUseBlocks.map(b => ({
          type: "tool_result",
          tool_use_id: b.id,
          content: toolResultBlocks.find(r => r.tool_use_id === b.id)?.content
            || "Search completed. Please now compile the job results into the required JSON format.",
        }));

        if (results.length === 0) break;
        messages = [...messages, { role: "user", content: results }];
        continue;
      }

      // Any other stop reason — break
      break;
    }

    if (!finalText) {
      return json({ error: "No text response from Claude", hint: "Try a simpler keyword" }, 500);
    }

    // Extract JSON from the text
    const cleaned = finalText.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    if (start === -1) return json({ error: "No JSON in response", raw: finalText.slice(0, 300) }, 500);

    try {
      return json(JSON.parse(cleaned.slice(start)));
    } catch {
      // Try to salvage partial job objects
      const hits = [];
      const re = /\{[^{}]*"title"[^{}]*\}/g;
      let m;
      while ((m = re.exec(cleaned)) !== null) {
        try { hits.push(JSON.parse(m[0])); } catch {}
      }
      if (hits.length > 0) return json({ jobs: hits, total: hits.length, query: "" });
      return json({ error: "Malformed JSON", raw: finalText.slice(0, 300) }, 500);
    }

  } catch (err) {
    return json({ error: err.message || "Unknown error" }, 500);
  }
}
