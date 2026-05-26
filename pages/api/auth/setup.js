import { getDb } from '../../../lib/db';
import { createHash } from 'crypto';

// One-time setup to create the marketer account
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password, name, setup_key } = req.body;
  if (setup_key !== (process.env.SETUP_KEY || 'setup123')) {
    return res.status(403).json({ error: 'Invalid setup key' });
  }
  const db = await getDb();
  const existing = await db.queryOne('SELECT id FROM users WHERE username=?', [username]);
  if (existing) return res.status(409).json({ error: 'User already exists' });
  const hash = createHash('sha256').update(password).digest('hex');
  await db.run('INSERT INTO users (username, password_hash, name) VALUES (?,?,?)', [username, hash, name]);
  res.json({ ok: true });
}
