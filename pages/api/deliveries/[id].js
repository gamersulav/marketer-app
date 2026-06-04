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

  if (req.method === 'PUT') {
    const delivery = await db.queryOne('SELECT * FROM deliveries WHERE id=?', [id]);
    if (!delivery) return res.status(404).json({ error: 'Not found' });

    // 36-hour edit window
    const createdAt = new Date(String(delivery.created_at).endsWith('Z') ? delivery.created_at : delivery.created_at + 'Z');
    const ageHours = (Date.now() - createdAt.getTime()) / 3_600_000;
    if (ageHours > 36) return res.status(403).json({ error: 'Bills can only be edited within 36 hours of creation' });

    const { delivery_date, items, paid, note } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'At least one item required' });

    const newTotal = items.reduce((s, i) => s + Number(i.qty) * Number(i.unit_price), 0);
    const newPaid  = Math.min(Number(paid) || 0, newTotal);
    const oldDue   = Number(delivery.total) - Number(delivery.paid);
    const newDue   = newTotal - newPaid;
    const delta    = newDue - oldDue; // positive → shop owes more, negative → shop owes less

    await db.tx(async tx => {
      await tx.run('DELETE FROM delivery_items WHERE delivery_id=?', [id]);

      for (const item of items) {
        const subtotal = Number(item.qty) * Number(item.unit_price);
        await tx.run(
          'INSERT INTO delivery_items (delivery_id, product_name, unit, qty, unit_price, subtotal) VALUES (?,?,?,?,?,?)',
          [id, String(item.product_name).trim(), item.unit || 'pcs', Number(item.qty), Number(item.unit_price), subtotal]
        );
      }

      await tx.run(
        'UPDATE deliveries SET delivery_date=?, total=?, paid=?, note=? WHERE id=?',
        [delivery_date || delivery.delivery_date, newTotal, newPaid, note ?? delivery.note, id]
      );

      if (delta !== 0) {
        await tx.run('UPDATE shops SET outstanding=MAX(0, outstanding+?) WHERE id=?', [delta, delivery.shop_id]);
      }
    });

    const updated = await db.queryOne(
      'SELECT d.*, s.name as shop_name, s.phone as shop_phone FROM deliveries d JOIN shops s ON s.id=d.shop_id WHERE d.id=?',
      [id]
    );
    const updatedItems = await db.query('SELECT * FROM delivery_items WHERE delivery_id=? ORDER BY id ASC', [id]);
    return res.json({ ...updated, items: updatedItems });
  }

  res.status(405).end();
}
