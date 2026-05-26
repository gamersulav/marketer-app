import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

export default function BillDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [bill, setBill] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/deliveries/${id}`).then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => d && setBill(d));
  }, [id, router]);

  async function collectPayment(e) {
    e.preventDefault();
    if (!payAmt || Number(payAmt) <= 0) return;
    setSaving(true);
    const r = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: bill.shop_id, delivery_id: id, amount: Number(payAmt), note: `Payment for Bill #${id}` }),
    });
    if (r.ok) {
      // Refresh bill
      fetch(`/api/deliveries/${id}`).then(r => r.json()).then(setBill);
      setPayAmt('');
      setPaying(false);
    }
    setSaving(false);
  }

  if (!bill) return <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Loading...</div>;

  const due = Math.max(0, Number(bill.total) - Number(bill.paid));

  return (
    <>
      <Head><title>Bill #{id} — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '16px', color: '#fff' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8, padding: 0 }}>← Back</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>Bill #{id}</h1>
              <p style={{ fontSize: 13, opacity: 0.8, marginTop: 3 }}>{bill.shop_name}</p>
              <p style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{bill.delivery_date}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(bill.total)}</div>
            </div>
          </div>
        </div>

        {/* Due Banner */}
        {due > 0 ? (
          <div style={{ background: '#e74c3c', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Amount Due</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(due)}</div>
            </div>
            <button onClick={() => setPaying(p => !p)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 600 }}>
              {paying ? 'Cancel' : '💰 Collect'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#27ae60', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>✓ Fully Paid</div>
            <div style={{ fontSize: 14 }}>Collected: {fmt(bill.paid)}</div>
          </div>
        )}

        {/* Payment Form */}
        {paying && (
          <form onSubmit={collectPayment} style={{ background: '#fff', margin: '12px', borderRadius: 12, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Collect Payment</h3>
            <input type="number" placeholder={`Amount (due: ${fmt(due)})`} value={payAmt} onChange={e => setPayAmt(e.target.value)} min="1" step="1"
              style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, marginBottom: 8, outline: 'none' }} required />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setPayAmt(String(Math.floor(due)))}
                style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Full</button>
              <button type="submit" disabled={saving}
                style={{ flex: 2, padding: '10px', background: saving ? '#aaa' : '#27ae60', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </form>
        )}

        {/* Bill Items */}
        <div style={{ padding: '12px' }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 13, color: '#444' }}>
              Items ({bill.items?.length || 0})
            </div>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '8px 12px', background: '#f8f8f8', fontSize: 11, color: '#888', fontWeight: 600 }}>
              <span>PRODUCT</span>
              <span style={{ textAlign: 'right' }}>QTY × PRICE</span>
              <span style={{ textAlign: 'right', minWidth: 70 }}>SUBTOTAL</span>
            </div>
            {(bill.items || []).map((item, i) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '10px 12px', borderBottom: i < bill.items.length - 1 ? '1px solid #f8f8f8' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{item.unit}</div>
                </div>
                <div style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>
                  {item.qty} × {fmt(item.unit_price)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', minWidth: 70 }}>{fmt(item.subtotal)}</div>
              </div>
            ))}
            {/* Total Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f0f4ff', borderTop: '2px solid #e8ecf8' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#0f3460' }}>{fmt(bill.total)}</span>
            </div>
            {bill.paid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f0fef4' }}>
                <span style={{ fontSize: 14, color: '#555' }}>Paid</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#27ae60' }}>{fmt(bill.paid)}</span>
              </div>
            )}
            {due > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fef9f0' }}>
                <span style={{ fontSize: 14, color: '#555' }}>Remaining Due</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#e74c3c' }}>{fmt(due)}</span>
              </div>
            )}
          </div>

          {bill.note && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', fontSize: 13, color: '#666' }}>
              📝 {bill.note}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
