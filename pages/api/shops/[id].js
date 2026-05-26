import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();
  const id = Number(req.query.id);

  if (req.method === 'GET') {
    const shop = await db.queryOne('SELECT * FROM shops WHERE id=?', [id]);
    if (!shop) return res.status(404).json({ error: 'Not found' });
    const deliveries = await db.query(
      'SELECT d.*, (SELECT COUNT(*) FROM delivery_items WHERE delivery_id=d.id) as item_count FROM deliveries d WHERE d.shop_id=? ORDER BY d.delivery_date DESC, d.id DESC LIMIT 50',
      [id]
    );
    const payments = await db.query(
      'SELECT * FROM payments WHERE shop_id=? ORDER BY payment_date DESC, id DESC LIMIT 30',
      [id]
    );
    return res.json({ shop, deliveries, payments });
  }

  if (req.method === 'PATCH') {
    const { name, owner, phone, address } = req.body;
    await db.run(
      'UPDATE shops SET name=COALESCE(?,name), owner=COALESCE(?,owner), phone=COALESCE(?,phone), address=COALESCE(?,address) WHERE id=?',
      [name || null, owner || null, phone || null, address || null, id]
    );
    const shop = await db.queryOne('SELECT * FROM shops WHERE id=?', [id]);
    return res.json(shop);
  }

  res.status(405).end();
}
