export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pageId, searchQuery, comment } = req.body;
  const notionToken = process.env.NOTION_TOKEN;

  if (!notionToken) return res.status(500).json({ error: 'Notion token not configured' });
  if (!comment) return res.status(400).json({ error: 'Missing comment' });

  const headers = {
    'Authorization': `Bearer ${notionToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };

  let targetId = pageId;

  // If no pageId, search Notion for the page by name
  if (!targetId && searchQuery) {
    try {
      const searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: searchQuery,
          filter: { value: 'page', property: 'object' },
          page_size: 1,
        }),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results.length > 0) {
          targetId = searchData.results[0].id;
        }
      }
    } catch {}
    if (!targetId) return res.status(404).json({ error: 'Page not found in Notion' });
  }

  if (!targetId) return res.status(400).json({ error: 'Missing pageId or searchQuery' });

  // Ensure ID is correctly formatted as UUID
  const clean = targetId.replace(/-/g, '');
  const formatted = clean.length === 32
    ? `${clean.slice(0,8)}-${clean.slice(8,12)}-${clean.slice(12,16)}-${clean.slice(16,20)}-${clean.slice(20)}`
    : targetId;

  try {
    const response = await fetch('https://api.notion.com/v1/comments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { page_id: formatted },
        rich_text: [{ type: 'text', text: { content: comment } }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.message || 'Failed to post comment' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Network error posting comment' });
  }
}
