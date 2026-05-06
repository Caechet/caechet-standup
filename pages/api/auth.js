export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;
  const correct = process.env.LOGIN_PASSWORD;

  if (!correct) return res.status(500).json({ error: 'Auth not configured' });
  if (password !== correct) return res.status(401).json({ error: 'Incorrect password' });

  // Set httpOnly cookie valid for 7 days
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  res.setHeader('Set-Cookie', `caechet_auth=1; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`);
  return res.status(200).json({ success: true });
}
