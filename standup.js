import { kv } from '@vercel/kv';

export default async function handler(req, res) {

  if (req.method === 'POST') {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    // Try to detect if the text is actually JSON (structured data from Claude)
    let standupText = text;
    let standupData = null;
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith('{')) {
        standupData = JSON.parse(trimmed);
        standupText = null;
      }
    } catch {}

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }).toUpperCase();

    const payload = {
      text: standupText,
      data: standupData,
      date: new Date().toISOString(),
      title: `CAECHET STANDUP — ${dateStr}`,
    };

    await kv.set('standup:latest', JSON.stringify(payload));

    // Store structured data separately if present
    if (standupData) {
      await kv.set('standup:data', JSON.stringify(standupData));
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    const raw = await kv.get('standup:latest');
    if (!raw) return res.status(404).json({ error: 'No standup available yet' });
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json(d);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
