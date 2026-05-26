import { getDb } from '../../../lib/db';

// Public endpoint — no auth required, token is the shop's secret link
export default async function handler(req, res) {
  const db = await getDb();
  const { token } = req.query;

  const shop = await db.queryOne(
    `SELECT id, name, owner, phone, address FROM shops WHERE order_token=?`,
    [token]
  );
  if (!shop) return res.status(404).json({ error: 'Invalid link' });

  if (req.method === 'GET') {
    return res.json({ shop });
  }

  if (req.method === 'POST') {
    const { items, note } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'No items' });

    const validItems = items.filter(i => Number(i.qty) > 0 && i.product_name?.trim());
    if (!validItems.length) return res.status(400).json({ error: 'No valid items' });

    let orderId;
    await db.tx(async tx => {
      const r = await tx.run(
        `INSERT INTO orders (shop_id, status, note, total) VALUES (?, 'pending', ?, 0)`,
        [shop.id, note || null]
      );
      orderId = Number(r.lastInsertRowid);
      for (const item of validItems) {
        await tx.run(
          `INSERT INTO order_items (order_id, product_name, unit, qty, unit_price, subtotal) VALUES (?,?,?,?,0,0)`,
          [orderId, item.product_name.trim(), item.unit || 'pcs', Number(item.qty)]
        );
      }
    });

    return res.json({ ok: true, order_id: orderId });
  }

  res.status(405).end();
}
