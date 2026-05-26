import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { BottomNav } from './index';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts + 'Z')) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [acting, setActing] = useState(null);

  const load = useCallback(async (status) => {
    setLoading(true);
    const r = await fetch(`/api/orders?status=${status}`);
    if (r.status === 401) { router.push('/login'); return; }
    setOrders(await r.json());
    setLoading(false);
  }, [router]);

  useEffect(() => { load(tab); }, [tab, load]);

  async function act(orderId, action) {
    setActing(orderId + action);
    const r = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const d = await r.json();
    setActing(null);
    if (action === 'convert' && d.delivery_id) {
      router.push(`/bills/${d.delivery_id}`);
    } else {
      load(tab);
    }
  }

  const pendingCount = tab === 'pending' ? orders.length : null;

  return (
    <>
      <Head><title>Orders — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #8e44ad, #6c3483)', padding: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>📬 Orders Inbox</h1>
              <p style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>Orders placed by your shops</p>
            </div>
            <button onClick={() => load(tab)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
              Refresh
            </button>
          </div>

          {/* Tab Bar */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {['pending', 'confirmed', 'delivered', 'cancelled'].map(s => (
              <button key={s} onClick={() => setTab(s)}
                style={{ flex: 1, padding: '7px 4px', background: tab === s ? '#fff' : 'rgba(255,255,255,0.15)', color: tab === s ? '#8e44ad' : '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading...</div>
          ) : orders.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: '3rem 16px', textAlign: 'center', color: '#888', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'pending' ? '📭' : '✅'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                {tab === 'pending' ? 'No pending orders' : `No ${tab} orders`}
              </div>
              <div style={{ fontSize: 13 }}>
                {tab === 'pending' ? 'Share the order link with your shops and they can order from their phones.' : ''}
              </div>
            </div>
          ) : (
            orders.map(order => (
              <OrderCard key={order.id} order={order} tab={tab} acting={acting} onAct={act} />
            ))
          )}
        </div>

        <BottomNav active="orders" />
      </div>
    </>
  );
}

function OrderCard({ order, tab, acting, onAct }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ background: '#fff', borderRadius: 14, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', border: tab === 'pending' ? '2px solid #8e44ad22' : '2px solid transparent' }}>
      {/* Card header */}
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 14px 12px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{order.shop_name}</div>
            {order.shop_phone && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{order.shop_phone}</div>}
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
              Order #{order.id} · {timeAgo(order.created_at)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f3460' }}>{fmt(order.total)}</div>
            <div style={{ fontSize: 11, marginTop: 4, padding: '3px 8px', borderRadius: 6, display: 'inline-block', fontWeight: 700,
              background: tab === 'pending' ? '#f3e5ff' : tab === 'confirmed' ? '#e3f4ff' : tab === 'delivered' ? '#e8fff4' : '#fff0f0',
              color: tab === 'pending' ? '#8e44ad' : tab === 'confirmed' ? '#0077cc' : tab === 'delivered' ? '#00b894' : '#e74c3c',
            }}>
              {tab}
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f5f5f5' }}>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f8f8f8' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.product_name}</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>{item.qty} {item.unit} × {fmt(item.unit_price)}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f3460' }}>{fmt(item.subtotal)}</div>
            </div>
          ))}

          {order.note && (
            <div style={{ padding: '10px 14px', background: '#fffdf0', fontSize: 13, color: '#888', borderBottom: '1px solid #f5f5f5' }}>
              📝 {order.note}
            </div>
          )}

          {/* Actions */}
          {tab === 'pending' && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 14px' }}>
              <button onClick={() => onAct(order.id, 'cancel')} disabled={!!acting}
                style={{ flex: 1, padding: '11px', background: '#fef0f0', color: '#e74c3c', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                ✕ Cancel
              </button>
              <button onClick={() => onAct(order.id, 'convert')} disabled={!!acting}
                style={{ flex: 2, padding: '11px', background: acting === order.id + 'convert' ? '#aaa' : '#8e44ad', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                {acting === order.id + 'convert' ? 'Creating bill...' : '🧾 Convert to Bill'}
              </button>
            </div>
          )}

          {tab === 'confirmed' && (
            <div style={{ padding: '12px 14px' }}>
              <button onClick={() => onAct(order.id, 'convert')} disabled={!!acting}
                style={{ width: '100%', padding: '11px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                {acting === order.id + 'convert' ? 'Creating...' : '🧾 Convert to Bill'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
