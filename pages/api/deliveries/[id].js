import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();
  const id = Number(req.query.id);

  if (req.method === 'GET') {
    const delivery = await db.queryOne(
      'SELECT d.*, s.name as shop_name, s.phone as shop_phone FROM deliveries d JOIN shops s ON s.id=d.shop_id WHERE d.id=?',
      [id]
    );
    if (!delivery) return res.status(404).json({ error: 'Not found' });
    const items = await db.query('SELECT * FROM delivery_items WHERE delivery_id=? ORDER BY id ASC', [id]);
    return res.json({ ...delivery, items });
  }

  res.status(405).end();
}
