import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { BottomNav } from './index';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

export default function Collect() {
  const router = useRouter();
  const [shops, setShops] = useState([]);
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/shops').then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => d && setShops(d.filter(s => s.outstanding > 0)));
  }, [router]);

  const shop = shops.find(s => String(s.id) === String(selected));

  async function submit(e) {
    e.preventDefault();
    if (!selected || !amount) return;
    setSaving(true);
    setError('');
    const r = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: selected, amount: Number(amount), note: note || undefined, payment_date: payDate }),
    });
    setSaving(false);
    if (r.ok) {
      const d = await r.json();
      setSuccess(`Payment of ${fmt(amount)} recorded for ${shop?.name}. Remaining: ${fmt(d.shop.outstanding)}`);
      setAmount('');
      setNote('');
      setShops(prev => prev.map(s => String(s.id) === String(selected) ? d.shop : s).filter(s => s.outstanding > 0));
      if (d.shop.outstanding <= 0) setSelected('');
    } else {
      const d = await r.json();
      setError(d.error || 'Failed');
    }
  }

  return (
    <>
      <Head><title>Collect — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 80 }}>
        <div style={{ background: 'linear-gradient(135deg, #27ae60, #1e8449)', padding: '16px', color: '#fff' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>💰 Collect Payment</h1>
          <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Record cash collection from shops</p>
        </div>

        <div style={{ padding: '16px' }}>
          {success && (
            <div style={{ background: '#f0fef4', border: '1.5px solid #27ae60', borderRadius: 10, padding: '12px', marginBottom: 12, color: '#1e8449', fontSize: 14 }}>
              ✓ {success}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>SHOP</label>
              <select value={selected} onChange={e => { setSelected(e.target.value); setSuccess(''); }} required
                style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, background: '#fff', marginBottom: 10 }}>
                <option value="">Select shop with due...</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name} — Due: {fmt(s.outstanding)}</option>)}
              </select>

              {shop && (
                <div style={{ background: '#fef9f0', borderRadius: 8, padding: '10px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#666' }}>Outstanding:</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#e67e22' }}>{fmt(shop.outstanding)}</span>
                </div>
              )}

              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>AMOUNT COLLECTED</label>
              <input type="number" placeholder="Enter amount" value={amount} onChange={e => { setAmount(e.target.value); setSuccess(''); }} min="1" step="1" required
                style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 16, marginBottom: 8, outline: 'none' }} />

              {shop && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button type="button" onClick={() => setAmount(String(Math.floor(shop.outstanding)))}
                    style={{ flex: 1, padding: '8px', background: '#f0fef4', border: 'none', borderRadius: 8, fontSize: 13, color: '#27ae60', fontWeight: 600 }}>
                    Full: {fmt(shop.outstanding)}
                  </button>
                </div>
              )}

              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>DATE</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 8 }} />

              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>NOTE (optional)</label>
              <input type="text" placeholder="e.g. Cash, partial payment" value={note} onChange={e => setNote(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>

            {error && <div style={{ background: '#fef0f0', color: '#e74c3c', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 14 }}>{error}</div>}

            <button type="submit" disabled={saving || !selected || !amount}
              style={{ width: '100%', padding: '15px', background: saving || !selected || !amount ? '#aaa' : '#27ae60', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700 }}>
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
          </form>

          {/* All shops with outstanding */}
          {shops.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, marginTop: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 13, color: '#444' }}>
                All Outstanding Shops ({shops.length})
              </div>
              {shops.map((s, i) => (
                <Link key={s.id} href={`/shops/${s.id}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderBottom: i < shops.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e74c3c' }}>{fmt(s.outstanding)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <BottomNav active="collect" />
      </div>
    </>
  );
}
