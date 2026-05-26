import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();

  if (req.method === 'GET') {
    const shops = await db.query('SELECT * FROM shops ORDER BY name ASC');
    return res.json(shops);
  }

  if (req.method === 'POST') {
    const { name, owner, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const { randomBytes } = await import('crypto');
    const token = randomBytes(4).toString('hex');
    const r = await db.run(
      'INSERT INTO shops (name, owner, phone, address, order_token) VALUES (?,?,?,?,?)',
      [name, owner || null, phone || null, address || null, token]
    );
    const shop = await db.queryOne('SELECT * FROM shops WHERE id=?', [Number(r.lastInsertRowid)]);
    return res.json(shop);
  }

  res.status(405).end();
}
