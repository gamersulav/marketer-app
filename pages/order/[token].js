import { useState, useEffect } from 'react';
import Head from 'next/head';

const EMPTY = () => ({ id: Date.now() + Math.random(), name: '', qty: '' });

export default function OrderPortal() {
  const [token, setToken] = useState(null);
  const [shop, setShop] = useState(null);
  const [rows, setRows] = useState([EMPTY()]);
  const [note, setNote] = useState('');
  const [step, setStep] = useState('loading'); // loading | order | done | error
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const t = window.location.pathname.split('/order/')[1];
    setToken(t);
    fetch(`/api/order/${t}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setStep('error'); return; }
        setShop(d.shop);
        setStep('order');
      })
      .catch(() => setStep('error'));
  }, []);

  function updateRow(id, field, val) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }

  function addRow() {
    setRows(prev => [...prev, EMPTY()]);
  }

  function removeRow(id) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }

  const validRows = rows.filter(r => r.name.trim() && Number(r.qty) > 0);

  async function submit(e) {
    e.preventDefault();
    if (!validRows.length) return;
    setSubmitting(true);
    const items = validRows.map(r => ({
      product_name: r.name.trim(),
      qty: Number(r.qty),
    }));
    const r = await fetch(`/api/order/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, note }),
    });
    const d = await r.json();
    setSubmitting(false);
    if (d.ok) { setOrderId(d.order_id); setStep('done'); }
  }

  // ── LOADING ──
  if (step === 'loading') return (
    <Screen bg="#f0f4ff">
      <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
      <div style={{ fontSize: 18, color: '#888' }}>Loading...</div>
    </Screen>
  );

  // ── ERROR ──
  if (step === 'error') return (
    <Screen bg="#fff8f8">
      <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#e74c3c', marginBottom: 8 }}>Link not valid</div>
      <div style={{ fontSize: 15, color: '#999' }}>Ask your supplier for the correct link.</div>
    </Screen>
  );

  // ── DONE ──
  if (step === 'done') return (
    <>
      <Head><title>Order Sent!</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <Screen bg="linear-gradient(135deg,#00b894,#00cec9)">
        <div style={{ background: '#fff', borderRadius: 24, padding: '40px 28px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: 80, marginBottom: 12 }}>🎉</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#00b894', marginBottom: 8 }}>Order Sent!</h1>
          <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
            Your order #{orderId} has been received.<br />The supplier will be in touch soon! 🚚
          </p>
          <div style={{ fontSize: 13, color: '#bbb', marginBottom: 24 }}>{shop?.name}</div>
          <button onClick={() => { setRows([EMPTY()]); setNote(''); setStep('order'); }}
            style={{ width: '100%', padding: '14px', background: '#00b894', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700 }}>
            Place Another Order
          </button>
        </div>
      </Screen>
    </>
  );

  // ── ORDER FORM ──
  return (
    <>
      <Head>
        <title>Order — {shop?.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f0f4ff', paddingBottom: 32 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#0f3460)', padding: '24px 20px 28px', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🛍️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Place Your Order</h1>
          <div style={{ fontSize: 15, opacity: 0.75 }}>{shop?.name}</div>
        </div>

        <form onSubmit={submit} style={{ padding: '20px 16px' }}>

          {/* Instruction */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>✍️</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>Write what you want</div>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>Type each product name and how many you need.</div>
            </div>
          </div>

          {/* Item Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {rows.map((row, i) => (
              <div key={row.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* Item number */}
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0f4ff', color: '#0f3460', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i + 1}
                </div>

                {/* Product name */}
                <input
                  type="text"
                  placeholder="What do you want?"
                  value={row.name}
                  onChange={e => updateRow(row.id, 'name', e.target.value)}
                  style={{ flex: 1, padding: '11px 12px', border: '1.5px solid #e8eef8', borderRadius: 10, fontSize: 15, outline: 'none', color: '#1a1a2e', background: '#fafbff' }}
                  autoComplete="off"
                />

                {/* Quantity */}
                <input
                  type="number"
                  placeholder="Qty"
                  value={row.qty}
                  onChange={e => updateRow(row.id, 'qty', e.target.value)}
                  min="1"
                  style={{ width: 68, padding: '11px 10px', border: '1.5px solid #e8eef8', borderRadius: 10, fontSize: 15, outline: 'none', textAlign: 'center', fontWeight: 700, color: '#1a1a2e', background: '#fafbff' }}
                />

                {/* Remove */}
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(row.id)}
                    style={{ width: 36, height: 36, borderRadius: 10, background: '#fef0f0', border: 'none', color: '#e74c3c', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Row */}
          <button type="button" onClick={addRow}
            style={{ width: '100%', padding: '13px', background: '#fff', border: '2px dashed #c0d0f0', borderRadius: 14, fontSize: 15, color: '#0f3460', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>+</span> Add another item
          </button>

          {/* Note */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#888', display: 'block', marginBottom: 8 }}>
              📝 Any special note? (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Need it urgently, deliver before 11am..."
              style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e8eef8', borderRadius: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', color: '#1a1a2e', background: '#fafbff' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !validRows.length}
            style={{
              width: '100%',
              padding: '18px',
              background: submitting || !validRows.length
                ? '#ccc'
                : 'linear-gradient(135deg,#1a1a2e,#0f3460)',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              fontSize: 18,
              fontWeight: 800,
              boxShadow: validRows.length ? '0 6px 20px rgba(15,52,96,0.35)' : 'none',
              letterSpacing: '0.3px',
            }}>
            {submitting ? '⏳ Sending...' : `✅ Send Order (${validRows.length} item${validRows.length !== 1 ? 's' : ''})`}
          </button>

          {!validRows.length && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#bbb', marginTop: 10 }}>
              Fill in at least one item with a name and quantity
            </div>
          )}
        </form>
      </div>
    </>
  );
}

function Screen({ bg, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, padding: 24, textAlign: 'center' }}>
      {children}
    </div>
  );
}
