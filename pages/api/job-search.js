// pages/api/job-search.js
export const config = { runtime: "edge", maxDuration: 120 };

export default async function handler(req, res) {
  try {
    const cookie = req.headers.cookie || "";
    if (!cookie.includes("caechet_auth=1")) return res.status(401).json({ error: "Unauthorized" });
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { system, userMsg, useSearch = false } = req.body || {};
    if (!system || !userMsg) return res.status(400).json({ error: "Missing system or userMsg" });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    };

    const tools = useSearch ? [{ type: "web_search_20250305", name: "web_search" }] : [];

    // agentic loop — keep calling until we get a text response (max 5 turns)
    let messages = [{ role: "user", content: userMsg }];
    let finalText = "";

    for (let turn = 0; turn < 5; turn++) {
      const body = { model: "claude-sonnet-4-5", max_tokens: 4000, system, messages };
      if (tools.length) body.tools = tools;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers, body: JSON.stringify(body),
      });

      if (!r.ok) {
        const t = await r.text();
        return res.status(500).json({ error: `Anthropic ${r.status}: ${t.slice(0, 200)}` });
      }

      const data = await r.json();
      if (data.error) return res.status(500).json({ error: data.error.message });

      const content = data.content || [];

      // collect any text blocks
      const textBlocks = content.filter(b => b.type === "text").map(b => b.text);
      if (textBlocks.length > 0) {
        finalText = textBlocks.join("\n");
        break;
      }

      // if stop_reason is tool_use, feed results back and continue
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

      // any other stop reason — break
      break;
    }

    if (!finalText.trim()) {
      // debug — return what we actually got
      const lastMsg = messages[messages.length - 1];
      const lastContent = Array.isArray(lastMsg?.content) ? lastMsg.content : [];
      return res.status(500).json({
        error: "No text response after tool calls",
        contentTypes: lastContent.map(b => b.type),
        turnCount: messages.length,
      });
    }

    const cleaned = finalText.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    if (start === -1) return res.status(500).json({ error: "No JSON found", raw: finalText.slice(0, 200) });

    try {
      return res.status(200).json(JSON.parse(cleaned.slice(start)));
    } catch {
      const hits = [];
      const re = /\{[^{}]*"title"[^{}]*\}/g;
      let m;
      while ((m = re.exec(cleaned)) !== null) {
        try { hits.push(JSON.parse(m[0])); } catch {}
      }
      if (hits.length > 0) return res.status(200).json({ jobs: hits, total: hits.length, query: "", partial: true });
      return res.status(500).json({ error: "Malformed JSON", raw: finalText.slice(0, 200) });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
