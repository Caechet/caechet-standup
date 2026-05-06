import { kv } from '@vercel/kv';

const ALLOWED_PREFIXES = [
  'standup:next-steps',
  'standup:meeting-announcements',
  'standup:comments:',
  'standup:campaign-notes',
  'standup:approval-notes',
];

function isAllowed(key) {
  return ALLOWED_PREFIXES.some(p => key === p || key.startsWith(p));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { key } = req.query;
  if (!key || !isAllowed(key)) return res.status(400).json({ error: 'Invalid key' });

  if (req.method === 'GET') {
    try {
      const raw = await kv.get(key);
      return res.status(200).json({ value: raw || null });
    } catch (e) {
      return res.status(500).json({ error: 'Storage error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { value } = req.body;
      if (value === undefined) return res.status(400).json({ error: 'Missing value' });
      await kv.set(key, value);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Storage error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
