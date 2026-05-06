export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'caechet_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.redirect('/login');
}
