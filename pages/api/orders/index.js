import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();

  if (req.method === 'GET') {
    const { status = 'pending' } = req.query;
    const orders = await db.query(
      `SELECT o.id, o.status, o.note, o.total, o.created_at,
              s.id as shop_id, s.name as shop_name, s.phone as shop_phone
       FROM orders o JOIN shops s ON s.id=o.shop_id
       WHERE o.status=?
       ORDER BY o.created_at DESC LIMIT 100`,
      [status]
    );
    if (!orders.length) return res.json([]);

    const ids = orders.map(o => o.id);
    const items = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY order_id, id`,
      ids
    );
    const byOrder = {};
    for (const item of items) {
      if (!byOrder[item.order_id]) byOrder[item.order_id] = [];
      byOrder[item.order_id].push(item);
    }
    return res.json(orders.map(o => ({ ...o, items: byOrder[o.id] || [] })));
  }

  res.status(405).end();
}
