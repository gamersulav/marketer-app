import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { BottomNav } from './index';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function History() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;

  const [shopFilter, setShopFilter] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async (reset = true) => {
    reset ? setLoading(true) : setLoadingMore(true);
    const params = new URLSearchParams({ limit: LIMIT, offset: reset ? 0 : offset });
    if (shopFilter) params.set('shop_id', shopFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const r = await fetch(`/api/history?${params}`);
    if (r.status === 401) { router.push('/login'); return; }
    const d = await r.json();
    if (reset) {
      setDeliveries(d.deliveries);
      setOffset(d.deliveries.length);
    } else {
      setDeliveries(prev => [...prev, ...d.deliveries]);
      setOffset(prev => prev + d.deliveries.length);
    }
    setTotalCount(d.total_count);
    reset ? setLoading(false) : setLoadingMore(false);
  }, [shopFilter, from, to, offset, router]);

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(setShops);
  }, []);

  useEffect(() => { load(true); }, [shopFilter, from, to]); // eslint-disable-line

  // summary totals for visible filters
  const visibleBilled = deliveries.reduce((s, d) => s + Number(d.total), 0);
  const visibleCollected = deliveries.reduce((s, d) => s + Number(d.paid), 0);
  const visibleDue = visibleBilled - visibleCollected;

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <>
      <Head><title>History — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '16px', color: '#fff' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>📋 Sales History</h1>

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, fontSize: 13, width: '100%' }} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, fontSize: 13, width: '100%' }} />
          </div>
          <select value={shopFilter} onChange={e => setShopFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, fontSize: 13 }}>
            <option value="" style={{ color: '#000' }}>All Shops</option>
            {shops.map(s => <option key={s.id} value={s.id} style={{ color: '#000' }}>{s.name}</option>)}
          </select>
        </div>

        {/* Summary Strip */}
        {!loading && deliveries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#fff', borderBottom: '1px solid #eee' }}>
            <SummaryCell label="Billed" value={fmt(visibleBilled)} color="#0f3460" />
            <SummaryCell label="Collected" value={fmt(visibleCollected)} color="#27ae60" />
            <SummaryCell label="Due" value={fmt(visibleDue)} color={visibleDue > 0 ? '#e74c3c' : '#27ae60'} />
          </div>
        )}

        <div style={{ padding: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading...</div>
          ) : deliveries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 12, color: '#888' }}>
              No sales found for this period.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8, paddingLeft: 2 }}>
                Showing {deliveries.length} of {totalCount} deliveries
              </div>

              {deliveries.map(d => (
                <DeliveryCard key={d.id} d={d} expanded={!!expanded[d.id]} onToggle={() => toggleExpand(d.id)} />
              ))}

              {deliveries.length < totalCount && (
                <button onClick={() => load(false)} disabled={loadingMore}
                  style={{ width: '100%', padding: '12px', background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 12, fontSize: 14, color: '#555', fontWeight: 600, marginTop: 4 }}>
                  {loadingMore ? 'Loading...' : `Load More (${totalCount - deliveries.length} remaining)`}
                </button>
              )}
            </>
          )}
        </div>

        <BottomNav active="history" />
      </div>
    </>
  );
}

function SummaryCell({ label, value, color }) {
  return (
    <div style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #eee' }}>
      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DeliveryCard({ d, expanded, onToggle }) {
  const due = Math.max(0, Number(d.total) - Number(d.paid));
  const itemSummary = d.items.map(i => i.product_name).join(', ');

  return (
    <div style={{ background: '#fff', borderRadius: 12, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      {/* Card Header — always visible */}
      <div onClick={onToggle} style={{ padding: '12px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ flex: 1, marginRight: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{d.shop_name}</span>
              {d.shop_phone && <span style={{ fontSize: 11, color: '#aaa' }}>{d.shop_phone}</span>}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>{d.delivery_date}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f3460' }}>{fmt(d.total)}</div>
            <div style={{ fontSize: 11, marginTop: 2, color: due > 0 ? '#e74c3c' : '#27ae60', fontWeight: 600 }}>
              {due > 0 ? `Due ${fmt(due)}` : '✓ Paid'}
            </div>
          </div>
        </div>

        {/* Item preview — collapsed */}
        {!expanded && (
          <div style={{ fontSize: 12, color: '#777', backgroundColor: '#f8f8f8', borderRadius: 6, padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
              {d.items.length} item{d.items.length !== 1 ? 's' : ''}: {itemSummary}
            </span>
            <span style={{ color: '#bbb', fontSize: 11, flexShrink: 0 }}>tap ▾</span>
          </div>
        )}

        {expanded && (
          <div style={{ fontSize: 12, color: '#bbb', textAlign: 'right' }}>tap ▴</div>
        )}
      </div>

      {/* Expanded: full item breakdown */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
          {/* Items table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '6px 12px', background: '#f8f8f8', fontSize: 10, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            <span>Product</span>
            <span style={{ textAlign: 'right' }}>Qty × Price</span>
            <span style={{ textAlign: 'right', minWidth: 72 }}>Subtotal</span>
          </div>

          {d.items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '9px 12px', borderBottom: '1px solid #f8f8f8', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{item.product_name}</div>
                <div style={{ fontSize: 11, color: '#bbb' }}>{item.unit}</div>
              </div>
              <div style={{ fontSize: 12, color: '#777', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {Number(item.qty) % 1 === 0 ? Number(item.qty) : Number(item.qty).toFixed(2)} × {fmt(item.unit_price)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', color: '#0f3460', minWidth: 72 }}>
                {fmt(item.subtotal)}
              </div>
            </div>
          ))}

          {/* Totals row */}
          <div style={{ padding: '10px 12px', background: '#f0f4ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: '#27ae60', fontWeight: 600 }}>Paid: {fmt(d.paid)}</span>
              {due > 0 && <span style={{ color: '#e74c3c', fontWeight: 600, marginLeft: 12 }}>Due: {fmt(due)}</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f3460' }}>Total: {fmt(d.total)}</div>
          </div>

          {d.note && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#888', background: '#fffdf0', borderTop: '1px solid #f5f0dc' }}>
              📝 {d.note}
            </div>
          )}

          {/* View full bill link */}
          <Link href={`/bills/${d.id}`}>
            <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', fontSize: 13, color: '#0f3460', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>View full bill #{d.id}</span>
              <span>›</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
