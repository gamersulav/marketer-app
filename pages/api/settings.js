import { getDb } from '../../lib/db';
import { getSession } from '../../lib/auth';

// Public keys anyone can read (used by /pay page without auth)
const PUBLIC_KEYS = ['payment_qr', 'payment_qr_label'];

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  const db = await getDb();

  if (req.method === 'GET') {
    const { key } = req.query;
    if (key) {
      // Single key — only allow public keys without auth
      if (!PUBLIC_KEYS.includes(key)) {
        const session = await getSession(req);
        if (!session) return res.status(401).json({ error: 'Unauthorized' });
      }
      const row = await db.queryOne('SELECT value FROM settings WHERE key=?', [key]);
      return res.json({ key, value: row?.value ?? null });
    }
    // All settings — requires auth
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await db.query('SELECT key, value FROM settings');
    const result = {};
    for (const r of rows) result[r.key] = r.value;
    return res.json(result);
  }

  if (req.method === 'POST') {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value ?? '']);
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'key required' });
    await db.run('DELETE FROM settings WHERE key=?', [key]);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
