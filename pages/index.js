import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }
function today() { return new Date().toISOString().slice(0, 10); }

const CARD_SHADOW = '0 2px 16px rgba(15,52,96,0.08)';

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#eaecf2', paddingBottom: 80 }}>

        <div style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #0f3460 100%)', color: '#fff' }}>
          <div style={{ padding: '20px 18px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>📦 MarketRun</h1>
                <p style={{ fontSize: 12, opacity: 0.55, marginTop: 3, letterSpacing: '0.1px' }}>{todayLabel}</p>
              </div>
              <button onClick={logout}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                Logout
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 16 }}>
            {[
              { key: 'dashboard', label: '🏠 Dashboard' },
              { key: 'analytics', label: '📊 Analytics' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ flex: 1, padding: '11px 8px', background: 'none', border: 'none', color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: activeTab === tab.key ? 700 : 400, fontSize: 14, borderBottom: activeTab === tab.key ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', letterSpacing: '0.1px' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div style={{ padding: '18px 16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading...</div>
            ) : data && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <StatCard label="Billed Today" value={fmt(data.billed)} color="#0f3460" accent="#dde6ff" />
                  <StatCard label="Collected" value={fmt(data.collected)} color="#16a34a" accent="#dcfce7" />
                  <StatCard label="Due Today" value={fmt(data.due_today)} color="#dc2626" accent="#fee2e2" />
                  <StatCard label="Total Outstanding" value={fmt(data.total_outstanding)} color="#ea580c" accent="#ffedd5" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <ActionBtn href="/broadcast" icon="📢" label="Broadcast" color="#ea580c" shadow="rgba(234,88,12,0.35)" />
                  <ActionBtn href="/bills/new" icon="🧾" label="New Bill" color="#0f3460" shadow="rgba(15,52,96,0.35)" />
                  <ActionBtn href="/collect" icon="💰" label="Collect" color="#16a34a" shadow="rgba(22,163,74,0.35)" />
                </div>

                {data.today_deliveries.length > 0 && (
                  <Section title={`Today's Deliveries (${data.today_deliveries.length})`}>
                    {data.today_deliveries.map((d, i) => (
                      <Link key={d.id} href={`/bills/${d.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', borderBottom: i < data.today_deliveries.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{d.shop_name}</div>
                            {d.note && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{d.note}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{fmt(d.total)}</div>
                            <div style={{ fontSize: 12, marginTop: 2, color: d.total - d.paid > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>
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
                    {data.top_due.map((s, i) => (
                      <Link key={s.id} href={`/shops/${s.id}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', borderBottom: i < data.top_due.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          <div style={{ fontWeight: 500, fontSize: 14, color: '#111827' }}>{s.name}</div>
                          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>{fmt(s.outstanding)}</div>
                        </div>
                      </Link>
                    ))}
                  </Section>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ padding: '18px 16px' }}>
            {analyticsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading analytics...</div>
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
  const collectionRate = Number(tm.billed) > 0 ? Math.round((Number(tm.collected) / Number(tm.billed)) * 100) : 0;
  const growthPct = Number(lm.billed) > 0 ? Math.round(((Number(tm.billed) - Number(lm.billed)) / Number(lm.billed)) * 100) : null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: CARD_SHADOW }}>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, fontWeight: 600 }}>This Month</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f3460', letterSpacing: '-0.3px' }}>{fmt(tm.billed)}</div>
          {growthPct !== null && (
            <div style={{ fontSize: 12, color: growthPct >= 0 ? '#16a34a' : '#dc2626', marginTop: 3, fontWeight: 600 }}>
              {growthPct >= 0 ? '▲' : '▼'} {Math.abs(growthPct)}% vs last month
            </div>
          )}
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>{tm.bills} bills · {fmt(tm.collected)} collected</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: CARD_SHADOW }}>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, fontWeight: 600 }}>Last Month</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#6b7280', letterSpacing: '-0.3px' }}>{fmt(lm.billed)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{lm.bills} bills · {fmt(lm.collected)} collected</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: CARD_SHADOW }}>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, fontWeight: 600 }}>Collection Rate</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: collectionRate >= 80 ? '#16a34a' : collectionRate >= 50 ? '#ea580c' : '#dc2626', letterSpacing: '-0.5px' }}>
            {collectionRate}%
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 4, height: 5, marginTop: 10 }}>
            <div style={{ background: collectionRate >= 80 ? '#16a34a' : collectionRate >= 50 ? '#ea580c' : '#dc2626', height: '100%', borderRadius: 4, width: `${collectionRate}%` }} />
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>this month</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: CARD_SHADOW }}>
          <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8, fontWeight: 600 }}>Outstanding</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', letterSpacing: '-0.3px' }}>{fmt(data.outstanding.total)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>{data.outstanding.count} shop{data.outstanding.count !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: CARD_SHADOW }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Revenue Trend</span>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 }}>
            {[['weekly', '7 Days'], ['monthly', '6 Months']].map(([key, label]) => (
              <button key={key} onClick={() => setChartView(key)}
                style={{ padding: '4px 11px', background: chartView === key ? '#0f3460' : 'transparent', color: chartView === key ? '#fff' : '#6b7280', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90, marginBottom: 8 }}>
          {chartData.map((d, i) => {
            const barH = maxRevenue > 0 ? Math.max((d.revenue / maxRevenue) * 86, d.revenue > 0 ? 4 : 0) : 0;
            const collH = d.revenue > 0 ? (d.collected / d.revenue) * barH : 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ width: '100%', position: 'relative', height: barH, background: '#e0e7ff', borderRadius: '5px 5px 0 0' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: collH, background: '#0f3460', borderRadius: '5px 5px 0 0' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {chartData.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#9ca3af', fontWeight: 500 }}>{d.label}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
          {[['#e0e7ff', 'Billed'], ['#0f3460', 'Collected']].map(([bg, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, background: bg, borderRadius: 3 }} />
              <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {data.topShops.length > 0 && (
        <Section title="Top Shops This Month">
          {data.topShops.map((s, i) => {
            const rate = Number(s.revenue) > 0 ? Math.round((Number(s.collected) / Number(s.revenue)) * 100) : 0;
            return (
              <div key={i} style={{ padding: '13px 14px', borderBottom: i < data.topShops.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{s.name}</div>
                  <div style={{ fontWeight: 700, color: '#0f3460', fontSize: 14 }}>{fmt(s.revenue)}</div>
                </div>
                <div style={{ background: '#f3f4f6', borderRadius: 4, height: 4 }}>
                  <div style={{ background: '#16a34a', height: '100%', borderRadius: 4, width: `${rate}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Collected {rate}% · {fmt(s.collected)}</div>
              </div>
            );
          })}
        </Section>
      )}

      {data.topProducts.length > 0 && (
        <Section title="Top Products This Month">
          {data.topProducts.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', borderBottom: i < data.topProducts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{p.product_name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{Number(p.total_qty)} units sold</div>
              </div>
              <div style={{ fontWeight: 700, color: '#0f3460', fontSize: 14 }}>{fmt(p.revenue)}</div>
            </div>
          ))}
        </Section>
      )}

      {data.topShops.length === 0 && data.topProducts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2.5rem', background: '#fff', borderRadius: 16, color: '#9ca3af' }}>
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

function StatCard({ label, value, color, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '16px 14px', boxShadow: CARD_SHADOW, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.2px' }}>{value}</div>
    </div>
  );
}

function ActionBtn({ href, icon, label, color, shadow }) {
  return (
    <Link href={href}>
      <div style={{ background: color, borderRadius: 14, padding: '15px 8px', textAlign: 'center', color: '#fff', boxShadow: `0 4px 14px ${shadow}` }}>
        <div style={{ fontSize: 22, marginBottom: 5 }}>{icon}</div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1px' }}>{label}</div>
      </div>
    </Link>
  );
}

export function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, marginBottom: 12, boxShadow: CARD_SHADOW, overflow: 'hidden' }}>
      <div style={{ padding: '11px 14px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 13, color: '#374151', letterSpacing: '0.1px' }}>{title}</div>
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
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', animation: 'fadeInOverlay 0.2s ease' }} />
      <div style={{ position: 'fixed', top: 0, left: 0, width: 270, height: '100vh', background: 'linear-gradient(175deg, #0d1b2a 0%, #0f3460 100%)', zIndex: 501, display: 'flex', flexDirection: 'column', animation: 'slideInLeft 0.24s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ padding: '44px 22px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>📦 MarketRun</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 4, letterSpacing: '0.2px' }}>Distributor App</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 20 }}>
          {links.map(l => {
            const isActive = active === l.key;
            return (
              <Link key={l.key} href={l.href} onClick={onClose}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', textDecoration: 'none', background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', borderLeft: isActive ? '3px solid rgba(255,255,255,0.9)' : '3px solid transparent', transition: 'background 0.15s' }}>
                <span style={{ fontSize: 20 }}>{l.icon}</span>
                <span style={{ fontSize: 15, fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : 'rgba(255,255,255,0.58)', letterSpacing: '0.1px' }}>{l.label}</span>
              </Link>
            );
          })}
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>MarketRun v1.0</div>
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
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 -2px 20px rgba(0,0,0,0.07)', display: 'flex', zIndex: 100 }}>
        <button onClick={() => setDrawerOpen(true)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '9px 0 10px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
          <span style={{ fontSize: 20 }}>☰</span>
          <span style={{ fontSize: 10, marginTop: 2, fontWeight: 500 }}>Menu</span>
        </button>
        {links.map(l => {
          const isActive = active === l.key;
          return (
            <Link key={l.key} href={l.href}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '9px 0 10px', color: isActive ? '#0f3460' : '#9ca3af', textDecoration: 'none', position: 'relative' }}>
              {isActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 22, height: 2.5, background: '#0f3460', borderRadius: '0 0 3px 3px' }} />}
              <span style={{ fontSize: 20 }}>{l.icon}</span>
              <span style={{ fontSize: 10, marginTop: 2, fontWeight: isActive ? 700 : 500, letterSpacing: '0.1px' }}>{l.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
