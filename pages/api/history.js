import { getDb } from '../../lib/db';
import { getSession } from '../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();

  const { shop_id, from, to, limit = 50, offset = 0 } = req.query;

  const args = [];
  const where = [];
  if (shop_id) { where.push('d.shop_id=?'); args.push(Number(shop_id)); }
  if (from)    { where.push('d.delivery_date>=?'); args.push(from); }
  if (to)      { where.push('d.delivery_date<=?'); args.push(to); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const deliveries = await db.query(
    `SELECT d.id, d.delivery_date, d.total, d.paid, d.note,
            s.id as shop_id, s.name as shop_name, s.phone as shop_phone
     FROM deliveries d
     JOIN shops s ON s.id = d.shop_id
     ${whereClause}
     ORDER BY d.delivery_date DESC, d.id DESC
     LIMIT ? OFFSET ?`,
    [...args, Number(limit), Number(offset)]
  );

  if (!deliveries.length) return res.json({ deliveries: [], total_count: 0 });

  const ids = deliveries.map(d => d.id);
  const placeholders = ids.map(() => '?').join(',');
  const items = await db.query(
    `SELECT delivery_id, product_name, unit, qty, unit_price, subtotal
     FROM delivery_items
     WHERE delivery_id IN (${placeholders})
     ORDER BY delivery_id, id`,
    ids
  );

  const itemsByDelivery = {};
  for (const item of items) {
    if (!itemsByDelivery[item.delivery_id]) itemsByDelivery[item.delivery_id] = [];
    itemsByDelivery[item.delivery_id].push(item);
  }

  const [countRow] = await db.query(
    `SELECT COUNT(*) as cnt FROM deliveries d ${whereClause}`,
    args
  );

  return res.json({
    deliveries: deliveries.map(d => ({ ...d, items: itemsByDelivery[d.id] || [] })),
    total_count: Number(countRow.cnt),
  });
}
