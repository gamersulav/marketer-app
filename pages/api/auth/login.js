import { getDb } from '../../../lib/db';
import { signToken, setCookie } from '../../../lib/auth';
import { createHash } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password } = req.body;
  const db = await getDb();
  const user = await db.queryOne('SELECT * FROM users WHERE username=?', [username]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const hash = createHash('sha256').update(password).digest('hex');
  if (hash !== user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
  const token = await signToken({ id: user.id, username: user.username, name: user.name });
  setCookie(res, token);
  res.json({ ok: true, name: user.name });
}
