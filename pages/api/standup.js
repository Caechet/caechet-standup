import { kv } from '@vercel/kv';

export default async function handler(req, res) {

  // POST — Make sends the standup text here
  if (req.method === 'POST') {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    const payload = {
      text,
      date: new Date().toISOString(),
      title: `CAECHET STANDUP — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}`
    };
    await kv.set('standup:latest', JSON.stringify(payload));
    return res.status(200).json({ success: true });
  }

  // GET — frontend fetches the latest standup
  if (req.method === 'GET') {
    const raw = await kv.get('standup:latest');
    if (!raw) return res.status(404).json({ error: 'No standup available yet' });
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
