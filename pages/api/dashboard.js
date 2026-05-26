import { getDb } from '../../lib/db';
import { getSession } from '../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const db = await getDb();

  const today = req.query.date || new Date().toISOString().slice(0, 10);

  const [billedRow] = await db.query(
    "SELECT COALESCE(SUM(total),0) as billed, COALESCE(SUM(paid),0) as collected FROM deliveries WHERE delivery_date=?",
    [today]
  );
  const [outRow] = await db.query(
    "SELECT COALESCE(SUM(outstanding),0) as total_outstanding FROM shops"
  );
  const todayDeliveries = await db.query(
    "SELECT d.id, d.total, d.paid, d.note, s.name as shop_name FROM deliveries d JOIN shops s ON s.id=d.shop_id WHERE d.delivery_date=? ORDER BY d.id DESC",
    [today]
  );
  const topDue = await db.query(
    "SELECT id, name, outstanding FROM shops WHERE outstanding>0 ORDER BY outstanding DESC LIMIT 10"
  );

  return res.json({
    date: today,
    billed: Number(billedRow.billed),
    collected: Number(billedRow.collected),
    due_today: Number(billedRow.billed) - Number(billedRow.collected),
    total_outstanding: Number(outRow.total_outstanding),
    today_deliveries: todayDeliveries,
    top_due: topDue,
  });
}
