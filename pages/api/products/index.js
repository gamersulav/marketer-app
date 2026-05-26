import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();

  if (req.method === 'GET') {
    const products = await db.query('SELECT * FROM products ORDER BY name ASC');
    return res.json(products);
  }

  if (req.method === 'POST') {
    const { name, unit, default_price } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const r = await db.run(
      'INSERT INTO products (name, unit, default_price) VALUES (?,?,?)',
      [name, unit || 'pcs', Number(default_price) || 0]
    );
    const product = await db.queryOne('SELECT * FROM products WHERE id=?', [Number(r.lastInsertRowid)]);
    return res.json(product);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.run('DELETE FROM products WHERE id=?', [Number(id)]);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
