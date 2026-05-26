import { getDb } from '../../lib/db';
import { getSession } from '../../lib/auth';

export default async function handler(req, res) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  const db = await getDb();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const [daily, monthly, thisMonthRows, lastMonthRows, topShops, topProducts, outstandingRows] = await Promise.all([
    db.query(
      `SELECT delivery_date as date, SUM(total) as revenue, SUM(paid) as collected
       FROM deliveries
       WHERE delivery_date >= date('now', '-6 days')
       GROUP BY delivery_date ORDER BY delivery_date`
    ),
    db.query(
      `SELECT strftime('%Y-%m', delivery_date) as month, SUM(total) as revenue, SUM(paid) as collected
       FROM deliveries
       WHERE strftime('%Y-%m', delivery_date) >= strftime('%Y-%m', date('now', '-5 months'))
       GROUP BY month ORDER BY month`
    ),
    db.query(
      `SELECT COALESCE(SUM(total),0) as billed, COALESCE(SUM(paid),0) as collected, COUNT(*) as bills
       FROM deliveries WHERE strftime('%Y-%m', delivery_date) = ?`,
      [thisMonth]
    ),
    db.query(
      `SELECT COALESCE(SUM(total),0) as billed, COALESCE(SUM(paid),0) as collected, COUNT(*) as bills
       FROM deliveries WHERE strftime('%Y-%m', delivery_date) = ?`,
      [lastMonth]
    ),
    db.query(
      `SELECT s.name, SUM(d.total) as revenue, SUM(d.paid) as collected
       FROM deliveries d JOIN shops s ON d.shop_id = s.id
       WHERE strftime('%Y-%m', d.delivery_date) = ?
       GROUP BY d.shop_id, s.name ORDER BY revenue DESC LIMIT 5`,
      [thisMonth]
    ),
    db.query(
      `SELECT di.product_name, SUM(di.qty) as total_qty, SUM(di.subtotal) as revenue
       FROM delivery_items di JOIN deliveries d ON di.delivery_id = d.id
       WHERE strftime('%Y-%m', d.delivery_date) = ?
       GROUP BY di.product_name ORDER BY revenue DESC LIMIT 5`,
      [thisMonth]
    ),
    db.query(`SELECT COUNT(*) as count, COALESCE(SUM(outstanding),0) as total FROM shops WHERE outstanding > 0`),
  ]);

  return res.json({
    daily,
    monthly,
    thisMonth: thisMonthRows[0] || { billed: 0, collected: 0, bills: 0 },
    lastMonth: lastMonthRows[0] || { billed: 0, collected: 0, bills: 0 },
    topShops,
    topProducts,
    outstanding: outstandingRows[0] || { count: 0, total: 0 },
  });
}
