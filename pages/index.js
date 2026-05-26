import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }
function today() { return new Date().toISOString().slice(0, 10); }

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d) => {
    setLoading(true);
    const r = await fetch(`/api/dashboard?date=${d}`);
    if (r.status === 401) { router.push('/login'); return; }
    const json = await r.json();
    setData(json);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(date); }, [date, load]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <>
      <Head><title>MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 72 }}>
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '16px 16px 20px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700 }}>📦 MarketRun</h1>
              <p style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Daily Dashboard</p>
            </div>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
              Logout
            </button>
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 14, width: '100%' }} />
        </div>

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

        <BottomNav active="home" />
      </div>
    </>
  );
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

export function BottomNav({ active }) {
  const links = [
    { href: '/', icon: '🏠', label: 'Home', key: 'home' },
    { href: '/bills/new', icon: '🧾', label: 'New Bill', key: 'new' },
    { href: '/shops', icon: '🏪', label: 'Shops', key: 'shops' },
    { href: '/orders', icon: '📬', label: 'Orders', key: 'orders' },
    { href: '/broadcast', icon: '📢', label: 'Broadcast', key: 'broadcast' },
  ];
  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, background: '#fff', borderTop: '1px solid #e8e8e8', display: 'flex', zIndex: 100 }}>
      {links.map(l => (
        <Link key={l.key} href={l.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', color: active === l.key ? '#0f3460' : '#999', textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>{l.icon}</span>
          <span style={{ fontSize: 10, marginTop: 2, fontWeight: active === l.key ? 700 : 400 }}>{l.label}</span>
        </Link>
      ))}
    </div>
  );
}
