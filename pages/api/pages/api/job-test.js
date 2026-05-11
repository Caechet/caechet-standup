// pages/api/job-test.js
// Temporary diagnostic endpoint — delete after testing
export default async function handler(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("caechet_auth=1")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const keyPrefix = hasKey ? process.env.ANTHROPIC_API_KEY.slice(0, 10) + "..." : "NOT SET";

  // Test a minimal Anthropic call with no web search
  try {
    const res2 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 10,
        messages: [{ role: "user", content: "say hi" }],
      }),
    });
    const data = await res2.json();
    return res.status(200).json({
      keySet: hasKey,
      keyPrefix,
      anthropicStatus: res2.status,
      anthropicResponse: data,
    });
  } catch (err) {
    return res.status(500).json({ keySet: hasKey, keyPrefix, fetchError: err.message });
  }
}
