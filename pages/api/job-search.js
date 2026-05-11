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
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

    const { system, userMsg, useSearch = false } = body;
    if (!system || !userMsg) return json({ error: "Missing system or userMsg" }, 400);
    if (!process.env.ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

    const anthropicHeaders = {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    };

    const tools = useSearch ? [{ type: "web_search_20250305", name: "web_search" }] : [];

    // agentic loop — handle web search multi-turn (max 5 turns)
    let messages = [{ role: "user", content: userMsg }];
    let finalText = "";

    for (let turn = 0; turn < 5; turn++) {
      const reqBody = { model: "claude-sonnet-4-5", max_tokens: 4000, system, messages };
      if (tools.length) reqBody.tools = tools;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: anthropicHeaders,
        body: JSON.stringify(reqBody),
      });

      if (!r.ok) {
        const t = await r.text();
        return json({ error: `Anthropic ${r.status}: ${t.slice(0, 200)}` }, 500);
      }

      const data = await r.json();
      if (data.error) return json({ error: data.error.message }, 500);

      const content = data.content || [];
      const textBlocks = content.filter(b => b.type === "text").map(b => b.text);

      if (textBlocks.length > 0) {
        finalText = textBlocks.join("\n");
        break;
      }

      if (data.stop_reason === "tool_use") {
        const toolResults = content
          .filter(b => b.type === "tool_use")
          .map(b => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: b.input ? JSON.stringify(b.input) : "search completed",
          }));
        messages = [
          ...messages,
          { role: "assistant", content },
          { role: "user", content: toolResults },
        ];
        continue;
      }

      break;
    }

    if (!finalText.trim()) {
      const lastContent = Array.isArray(messages[messages.length - 1]?.content)
        ? messages[messages.length - 1].content : [];
      return json({
        error: "No text response after tool calls",
        contentTypes: lastContent.map(b => b.type),
        turns: messages.length,
      }, 500);
    }

    const cleaned = finalText.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    if (start === -1) return json({ error: "No JSON found", raw: finalText.slice(0, 200) }, 500);

    try {
      return json(JSON.parse(cleaned.slice(start)));
    } catch {
      const hits = [];
      const re = /\{[^{}]*"title"[^{}]*\}/g;
      let m;
      while ((m = re.exec(cleaned)) !== null) {
        try { hits.push(JSON.parse(m[0])); } catch {}
      }
      if (hits.length > 0) return json({ jobs: hits, total: hits.length, query: "", partial: true });
      return json({ error: "Malformed JSON", raw: finalText.slice(0, 200) }, 500);
    }
  } catch (err) {
    return json({ error: err.message || "Unknown error" }, 500);
  }
}
