import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();

  if (req.method === 'GET') {
    const { date, shop_id } = req.query;
    let sql = `SELECT d.*, s.name as shop_name FROM deliveries d JOIN shops s ON s.id=d.shop_id`;
    const args = [];
    const where = [];
    if (date) { where.push("d.delivery_date=?"); args.push(date); }
    if (shop_id) { where.push("d.shop_id=?"); args.push(Number(shop_id)); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY d.delivery_date DESC, d.id DESC LIMIT 100';
    const deliveries = await db.query(sql, args);
    return res.json(deliveries);
  }

  if (req.method === 'POST') {
    const { shop_id, delivery_date, items, paid, note } = req.body;
    if (!shop_id || !items?.length) return res.status(400).json({ error: 'shop_id and items required' });

    const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0);
    const paidAmt = Math.min(Number(paid) || 0, total);

    let deliveryId;
    await db.tx(async tx => {
      const r = await tx.run(
        'INSERT INTO deliveries (shop_id, delivery_date, total, paid, note) VALUES (?,?,?,?,?)',
        [Number(shop_id), delivery_date || new Date().toISOString().slice(0, 10), total, paidAmt, note || null]
      );
      deliveryId = Number(r.lastInsertRowid);

      for (const item of items) {
        const subtotal = Number(item.qty) * Number(item.unit_price);
        await tx.run(
          'INSERT INTO delivery_items (delivery_id, product_name, unit, qty, unit_price, subtotal) VALUES (?,?,?,?,?,?)',
          [deliveryId, item.product_name, item.unit || 'pcs', Number(item.qty), Number(item.unit_price), subtotal]
        );
      }

      const due = total - paidAmt;
      await tx.run('UPDATE shops SET outstanding=outstanding+? WHERE id=?', [due, Number(shop_id)]);

      if (paidAmt > 0) {
        await tx.run(
          'INSERT INTO payments (shop_id, delivery_id, amount, note, payment_date) VALUES (?,?,?,?,?)',
          [Number(shop_id), deliveryId, paidAmt, 'Paid at delivery', delivery_date || new Date().toISOString().slice(0, 10)]
        );
      }
    });

    const delivery = await db.queryOne('SELECT * FROM deliveries WHERE id=?', [deliveryId]);
    const itemsOut = await db.query('SELECT * FROM delivery_items WHERE delivery_id=?', [deliveryId]);
    return res.json({ ...delivery, items: itemsOut });
  }

  res.status(405).end();
}
