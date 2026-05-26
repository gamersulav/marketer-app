import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }
function today() { return new Date().toISOString().slice(0, 10); }
function fmtShortDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Sync analytics tab from URL query
  useEffect(() => {
    if (router.query.tab === 'analytics') setActiveTab('analytics');
  }, [router.query.tab]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/dashboard?date=${today()}`);
    if (r.status === 401) { router.push('/login'); return; }
    setData(await r.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    if (activeTab !== 'analytics' || analytics) return;
    setAnalyticsLoading(true);
    fetch('/api/analytics').then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => { if (d) { setAnalytics(d); setAnalyticsLoading(false); } });
  }, [activeTab, analytics, router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <Head><title>MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 72 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff' }}>
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>📦 MarketRun</h1>
                <p style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{todayLabel}</p>
              </div>
              <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
                Logout
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div style={{ display: 'flex', marginTop: 12 }}>
            {[
              { key: 'dashboard', label: '🏠 Dashboard' },
              { key: 'analytics', label: '📊 Analytics' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ flex: 1, padding: '10px 8px', background: 'none', border: 'none', color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: activeTab === tab.key ? 700 : 400, fontSize: 14, borderBottom: activeTab === tab.key ? '2.5px solid #fff' : '2.5px solid transparent', cursor: 'pointer' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={{ padding: '16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading...</div>
            ) : data && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <StatCard label="Billed Today" value={fmt(data.billed)} color="#0f3460" />
                  <StatCard label="Collected" value={fmt(data.collected)} color="#27ae60" />
                  <StatCard label="Due Today" value={fmt(data.due_today)} color="#e74c3c" />
                  <StatCard label="Total Outstanding" value={fmt(data.total_outstanding)} color="#e67e22" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <ActionBtn href="/broadcast" icon="📢" label="Broadcast" color="#e67e22" />
                  <ActionBtn href="/bills/new" icon="🧾" label="New Bill" color="#0f3460" />
                  <ActionBtn href="/collect" icon="💰" label="Collect" color="#27ae60" />
                </div>

                {data.today_deliveries.length > 0 && (
                  <Section title={`Today's Deliveries (${data.today_deliveries.length})`}>
                    {data.today_deliveries.map(d => (
                      <Link key={d.id} href={`/bills/${d.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderBottom: '1px solid #f0f0f0' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{d.shop_name}</div>
                            {d.note && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{d.note}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(d.total)}</div>
                            <div style={{ fontSize: 12, color: d.total - d.paid > 0 ? '#e74c3c' : '#27ae60' }}>
                              {d.total - d.paid > 0 ? `Due: ${fmt(d.total - d.paid)}` : '✓ Paid'}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </Section>
                )}

                {data.top_due.length > 0 && (
                  <Section title="Shops with Outstanding">
                    {data.top_due.map(s => (
                      <Link key={s.id} href={`/shops/${s.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontWeight: 700, color: '#e74c3c', fontSize: 14 }}>{fmt(s.outstanding)}</div>
                        </div>
                      </Link>
                    ))}
                  </Section>
                )}
              </>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div style={{ padding: '16px' }}>
            {analyticsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Loading analytics...</div>
            ) : analytics ? (
              <AnalyticsContent data={analytics} />
            ) : null}
          </div>
        )}

        <BottomNav active={activeTab === 'analytics' ? 'analytics' : 'home'} />
      </div>
    </>
  );
}

function AnalyticsContent({ data }) {
  const [chartView, setChartView] = useState('weekly');

  const dailyChart = buildDailyChart(data.daily);
  const monthlyChart = buildMonthlyChart(data.monthly);
  const chartData = chartView === 'weekly' ? dailyChart : monthlyChart;
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

  const tm = data.thisMonth;
  const lm = data.lastMonth;
  const collectionRate = tm.billed > 0 ? Math.round((Number(tm.collected) / Number(tm.billed)) * 100) : 0;
  const growthPct = lm.billed > 0 ? Math.round(((Number(tm.billed) - Number(lm.billed)) / Number(lm.billed)) * 100) : null;

  return (
    <>
      {/* Month Comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>This Month</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#0f3460' }}>{fmt(tm.billed)}</div>
          {growthPct !== null && (
            <div style={{ fontSize: 11, color: growthPct >= 0 ? '#27ae60' : '#e74c3c', marginTop: 2, fontWeight: 600 }}>
              {growthPct >= 0 ? '▲' : '▼'} {Math.abs(growthPct)}% vs last month
            </div>
          )}
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{tm.bills} bills · {fmt(tm.collected)} collected</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Last Month</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#666' }}>{fmt(lm.billed)}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{lm.bills} bills · {fmt(lm.collected)} collected</div>
        </div>
      </div>

      {/* Collection Rate + Outstanding */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Collection Rate</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: collectionRate >= 80 ? '#27ae60' : collectionRate >= 50 ? '#e67e22' : '#e74c3c' }}>
            {collectionRate}%
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 5, marginTop: 8 }}>
            <div style={{ background: collectionRate >= 80 ? '#27ae60' : collectionRate >= 50 ? '#e67e22' : '#e74c3c', height: '100%', borderRadius: 4, width: `${collectionRate}%` }} />
          </div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>this month</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Outstanding</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#e74c3c' }}>{fmt(data.outstanding.total)}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{data.outstanding.count} shop{data.outstanding.count !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>Revenue Trend</span>
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 2, gap: 2 }}>
            <button onClick={() => setChartView('weekly')}
              style={{ padding: '4px 10px', background: chartView === 'weekly' ? '#0f3460' : 'transparent', color: chartView === 'weekly' ? '#fff' : '#666', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              7 Days
            </button>
            <button onClick={() => setChartView('monthly')}
              style={{ padding: '4px 10px', background: chartView === 'monthly' ? '#0f3460' : 'transparent', color: chartView === 'monthly' ? '#fff' : '#666', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              6 Months
            </button>
          </div>
        </div>

        {/* Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90, marginBottom: 6 }}>
          {chartData.map((d, i) => {
            const barH = maxRevenue > 0 ? Math.max((d.revenue / maxRevenue) * 86, d.revenue > 0 ? 4 : 0) : 0;
            const collH = d.revenue > 0 ? (d.collected / d.revenue) * barH : 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ width: '100%', position: 'relative', height: barH, background: '#dde6ff', borderRadius: '4px 4px 0 0' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: collH, background: '#0f3460', borderRadius: '4px 4px 0 0' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis */}
        <div style={{ display: 'flex', gap: 5 }}>
          {chartData.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#aaa' }}>{d.label}</div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, background: '#dde6ff', borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#888' }}>Billed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, background: '#0f3460', borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: '#888' }}>Collected</span>
          </div>
        </div>
      </div>

      {/* Top Shops */}
      {data.topShops.length > 0 && (
        <Section title="Top Shops This Month">
          {data.topShops.map((s, i) => {
            const rate = Number(s.revenue) > 0 ? Math.round((Number(s.collected) / Number(s.revenue)) * 100) : 0;
            return (
              <div key={i} style={{ padding: '11px 12px', borderBottom: i < data.topShops.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontWeight: 700, color: '#0f3460', fontSize: 14 }}>{fmt(s.revenue)}</div>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: 3, height: 4 }}>
                  <div style={{ background: '#27ae60', height: '100%', borderRadius: 3, width: `${rate}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Collected {rate}% · {fmt(s.collected)}</div>
              </div>
            );
          })}
        </Section>
      )}

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <Section title="Top Products This Month">
          {data.topProducts.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderBottom: i < data.topProducts.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.product_name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{Number(p.total_qty)} units sold</div>
              </div>
              <div style={{ fontWeight: 700, color: '#0f3460', fontSize: 14 }}>{fmt(p.revenue)}</div>
            </div>
          ))}
        </Section>
      )}

      {data.topShops.length === 0 && data.topProducts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: 12, color: '#888' }}>
          No billing data for this month yet.
        </div>
      )}
    </>
  );
}

function buildDailyChart(dailyData) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const found = dailyData.find(r => r.date === dateStr);
    return { label: days[d.getDay()], revenue: found ? Number(found.revenue) : 0, collected: found ? Number(found.collected) : 0 };
  });
}

function buildMonthlyChart(monthlyData) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = monthlyData.find(r => r.month === monthStr);
    return { label: monthNames[d.getMonth()], revenue: found ? Number(found.revenue) : 0, collected: found ? Number(found.collected) : 0 };
  });
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '14px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ActionBtn({ href, icon, label, color }) {
  return (
    <Link href={href}>
      <div style={{ background: color, borderRadius: 12, padding: '14px 8px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      </div>
    </Link>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 13, color: '#444' }}>{title}</div>
      {children}
    </div>
  );
}

export function LeftDrawer({ active, onClose }) {
  const links = [
    { href: '/', icon: '🏠', label: 'Dashboard', key: 'home' },
    { href: '/?tab=analytics', icon: '📊', label: 'Analytics', key: 'analytics' },
    { href: '/shops', icon: '🏪', label: 'Shops', key: 'shops' },
    { href: '/history', icon: '📋', label: 'History', key: 'history' },
    { href: '/collect', icon: '💰', label: 'Collect', key: 'collect' },
    { href: '/settings', icon: '⚙️', label: 'Settings', key: 'settings' },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500 }} />
      <div style={{ position: 'fixed', top: 0, left: 0, width: 265, height: '100vh', background: 'linear-gradient(180deg, #1a1a2e 0%, #0f3460 100%)', zIndex: 501, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '40px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>📦 MarketRun</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Distributor App</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 6, paddingBottom: 20 }}>
          {links.map(l => {
            const isActive = active === l.key;
            return (
              <Link key={l.key} href={l.href} onClick={onClose}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', textDecoration: 'none', background: isActive ? 'rgba(255,255,255,0.13)' : 'transparent', borderLeft: isActive ? '3px solid #fff' : '3px solid transparent' }}>
                <span style={{ fontSize: 20 }}>{l.icon}</span>
                <span style={{ fontSize: 15, fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.65)' }}>{l.label}</span>
              </Link>
            );
          })}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>MarketRun v1.0</div>
        </div>
      </div>
    </>
  );
}

export function BottomNav({ active }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    { href: '/bills/new', icon: '🧾', label: 'New Bill', key: 'new' },
    { href: '/orders', icon: '📬', label: 'Orders', key: 'orders' },
    { href: '/broadcast', icon: '📢', label: 'Broadcast', key: 'broadcast' },
  ];

  return (
    <>
      {drawerOpen && <LeftDrawer active={active} onClose={() => setDrawerOpen(false)} />}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, background: '#fff', borderTop: '1px solid #e8e8e8', display: 'flex', zIndex: 100 }}>
        <button onClick={() => setDrawerOpen(true)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}>
          <span style={{ fontSize: 20 }}>☰</span>
          <span style={{ fontSize: 10, marginTop: 2, fontWeight: 400 }}>Menu</span>
        </button>
        {links.map(l => (
          <Link key={l.key} href={l.href}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', color: active === l.key ? '#0f3460' : '#999', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>{l.icon}</span>
            <span style={{ fontSize: 10, marginTop: 2, fontWeight: active === l.key ? 700 : 400 }}>{l.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
