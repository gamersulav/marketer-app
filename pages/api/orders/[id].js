import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();
  const orderId = Number(req.query.id);

  if (req.method === 'PATCH') {
    const { action } = req.body; // 'confirm' | 'cancel' | 'convert'

    if (action === 'cancel') {
      await db.run(`UPDATE orders SET status='cancelled' WHERE id=?`, [orderId]);
      return res.json({ ok: true });
    }

    if (action === 'confirm') {
      await db.run(`UPDATE orders SET status='confirmed' WHERE id=?`, [orderId]);
      return res.json({ ok: true });
    }

    if (action === 'convert') {
      // Convert order → delivery bill (marks order as delivered)
      const order = await db.queryOne(
        `SELECT o.*, s.id as shop_id FROM orders o JOIN shops s ON s.id=o.shop_id WHERE o.id=?`,
        [orderId]
      );
      if (!order) return res.status(404).json({ error: 'Not found' });

      const items = await db.query(`SELECT * FROM order_items WHERE order_id=?`, [orderId]);

      let deliveryId;
      await db.tx(async tx => {
        const r = await tx.run(
          `INSERT INTO deliveries (shop_id, total, paid, note) VALUES (?,?,0,?)`,
          [order.shop_id, order.total, `Converted from Order #${orderId}`]
        );
        deliveryId = Number(r.lastInsertRowid);
        for (const item of items) {
          await tx.run(
            `INSERT INTO delivery_items (delivery_id, product_name, unit, qty, unit_price, subtotal) VALUES (?,?,?,?,?,?)`,
            [deliveryId, item.product_name, item.unit, item.qty, item.unit_price, item.subtotal]
          );
        }
        await tx.run(`UPDATE shops SET outstanding=outstanding+? WHERE id=?`, [order.total, order.shop_id]);
        await tx.run(`UPDATE orders SET status='delivered' WHERE id=?`, [orderId]);
      });

      return res.json({ ok: true, delivery_id: deliveryId });
    }
  }

  res.status(405).end();
}
