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
      // Return order data so client can pre-fill /bills/new
      const order = await db.queryOne(
        `SELECT o.*, s.id as shop_id FROM orders o JOIN shops s ON s.id=o.shop_id WHERE o.id=?`,
        [orderId]
      );
      if (!order) return res.status(404).json({ error: 'Not found' });
      const items = await db.query(`SELECT * FROM order_items WHERE order_id=?`, [orderId]);
      await db.run(`UPDATE orders SET status='confirmed' WHERE id=?`, [orderId]);
      return res.json({ ok: true, redirect_to_bill: true, shop_id: order.shop_id, items });
    }
  }

  res.status(405).end();
}
