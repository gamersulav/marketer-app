import { getDb } from '../../../lib/db';
import { getSession } from '../../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();

  if (req.method === 'POST') {
    const { shop_id, amount, delivery_id, note, payment_date } = req.body;
    if (!shop_id || !amount) return res.status(400).json({ error: 'shop_id and amount required' });

    const amt = Number(amount);
    if (amt <= 0) return res.status(400).json({ error: 'amount must be positive' });

    await db.tx(async tx => {
      await tx.run(
        'INSERT INTO payments (shop_id, delivery_id, amount, note, payment_date) VALUES (?,?,?,?,?)',
        [Number(shop_id), delivery_id ? Number(delivery_id) : null, amt, note || null, payment_date || new Date().toISOString().slice(0, 10)]
      );
      await tx.run('UPDATE shops SET outstanding=MAX(0, outstanding-?) WHERE id=?', [amt, Number(shop_id)]);

      // Distribute payment across outstanding deliveries oldest-first so deliveries.paid stays accurate
      const unpaid = await tx.query(
        'SELECT id, total, paid FROM deliveries WHERE shop_id=? AND paid < total ORDER BY delivery_date ASC, id ASC',
        [Number(shop_id)]
      );
      let remaining = amt;
      for (const d of unpaid) {
        if (remaining <= 0) break;
        const due = Number(d.total) - Number(d.paid);
        const apply = Math.min(remaining, due);
        await tx.run('UPDATE deliveries SET paid=paid+? WHERE id=?', [apply, d.id]);
        remaining -= apply;
      }
    });

    const shop = await db.queryOne('SELECT * FROM shops WHERE id=?', [Number(shop_id)]);
    return res.json({ ok: true, shop });
  }

  res.status(405).end();
}
