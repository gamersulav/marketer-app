import { useState, useEffect } from 'react';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

const COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];

export default function OrderPortal() {
  const [token, setToken] = useState(null);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({}); // { product_id: qty }
  const [note, setNote] = useState('');
  const [step, setStep] = useState('loading'); // loading | shop | cart | confirm | done | error
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
        setProducts(d.products);
        setStep('shop');
      })
      .catch(() => setStep('error'));
  }, []);

  function setQty(id, val) {
    const q = Math.max(0, Math.round(val));
    setCart(prev => {
      const next = { ...prev };
      if (q === 0) delete next[id]; else next[id] = q;
      return next;
    });
  }

  function inc(id) { setQty(id, (cart[id] || 0) + 1); }
  function dec(id) { setQty(id, (cart[id] || 0) - 1); }

  const cartItems = products.filter(p => cart[p.id] > 0);
  const total = cartItems.reduce((s, p) => s + cart[p.id] * Number(p.default_price), 0);
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  async function submitOrder() {
    setSubmitting(true);
    const items = cartItems.map(p => ({
      product_name: p.name,
      unit: p.unit,
      qty: cart[p.id],
      unit_price: Number(p.default_price),
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff8f0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>📦</div>
        <div style={{ fontSize: 18, color: '#888' }}>Loading your store...</div>
      </div>
    </div>
  );

  // ── ERROR ──
  if (step === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff8f0', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e74c3c', marginBottom: 8 }}>Link not valid</div>
        <div style={{ fontSize: 15, color: '#888' }}>Ask your supplier for the correct ordering link.</div>
      </div>
    </div>
  );

  // ── ORDER DONE ──
  if (step === 'done') return (
    <>
      <Head><title>Order Placed!</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00b894, #00cec9)', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '40px 28px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#00b894', marginBottom: 8 }}>Order Placed!</h1>
          <div style={{ fontSize: 15, color: '#555', marginBottom: 20, lineHeight: 1.5 }}>
            Your order #{orderId} has been sent.<br />
            The supplier will deliver soon! 🚚
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Order Total</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#00b894' }}>{fmt(total)}</div>
          </div>
          <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
            {shop?.name} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <button onClick={() => { setCart({}); setNote(''); setStep('shop'); }}
            style={{ marginTop: 20, width: '100%', padding: '14px', background: '#00b894', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700 }}>
            Order Again
          </button>
        </div>
      </div>
    </>
  );

  // ── CART REVIEW ──
  if (step === 'cart') return (
    <>
      <Head><title>Your Order — {shop?.name}</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8f9fa', paddingBottom: 120 }}>
        {/* Header */}
        <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setStep('shop')}
            style={{ background: 'none', border: 'none', fontSize: 14, color: '#666', padding: 0, marginBottom: 8 }}>
            ← Back to products
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e' }}>Review Your Order</h2>
          <div style={{ fontSize: 13, color: '#888' }}>{shop?.name}</div>
        </div>

        <div style={{ padding: 16 }}>
          {/* Items */}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {cartItems.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < cartItems.length - 1 ? '1px solid #f5f5f5' : 'none', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: COLORS[p.id % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  📦
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{cart[p.id]} {p.unit} × {fmt(p.default_price)}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', flexShrink: 0 }}>
                  {fmt(cart[p.id] * Number(p.default_price))}
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
              📝 Special note (optional)
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="e.g. Need by tomorrow morning, deliver to back entrance..."
              style={{ width: '100%', padding: '12px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
          </div>

          {/* Total */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#555' }}>Order Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e' }}>{fmt(total)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Payment collected on delivery</div>
          </div>
        </div>

        {/* Place Order Button */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '16px', background: '#fff', borderTop: '1px solid #eee' }}>
          <button onClick={submitOrder} disabled={submitting}
            style={{ width: '100%', padding: '18px', background: submitting ? '#aaa' : 'linear-gradient(135deg, #00b894, #00cec9)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 18, fontWeight: 800, boxShadow: '0 4px 15px rgba(0,184,148,0.4)' }}>
            {submitting ? '⏳ Placing order...' : `✅ Place Order — ${fmt(total)}`}
          </button>
        </div>
      </div>
    </>
  );

  // ── MAIN SHOP PAGE ──
  if (products.length === 0) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff8f0', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🏪</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Hi, {shop?.name}!</div>
        <div style={{ fontSize: 15, color: '#888' }}>No products available yet. Check back soon!</div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Order — {shop?.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f8f9fa', paddingBottom: cartCount > 0 ? 120 : 32 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '20px 16px 24px', color: '#fff' }}>
          <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 4 }}>Ordering for</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{shop?.name}</h1>
          {shop?.owner && <div style={{ fontSize: 13, opacity: 0.75 }}>{shop.owner}</div>}
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', fontSize: 13, display: 'inline-block' }}>
            👆 Tap + to add items to your order
          </div>
        </div>

        {/* Product List */}
        <div style={{ padding: '12px 12px 0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, paddingLeft: 4 }}>
            {products.length} Products Available
          </div>

          {products.map((p, idx) => {
            const qty = cart[p.id] || 0;
            const color = COLORS[idx % COLORS.length];
            return (
              <div key={p.id} style={{
                background: '#fff',
                borderRadius: 18,
                marginBottom: 10,
                padding: '16px',
                boxShadow: qty > 0 ? '0 4px 16px rgba(0,184,148,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                border: qty > 0 ? '2px solid #00b894' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Color icon */}
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: color + '22', border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    📦
                  </div>

                  {/* Product info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 2, lineHeight: 1.2 }}>{p.name}</div>
                    <div style={{ fontSize: 14, color: '#888' }}>per {p.unit}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: color, marginTop: 4 }}>{fmt(p.default_price)}</div>
                  </div>

                  {/* Counter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                    {qty === 0 ? (
                      <button onClick={() => inc(p.id)}
                        style={{ width: 52, height: 52, borderRadius: 14, background: '#1a1a2e', color: '#fff', border: 'none', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        +
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => dec(p.id)}
                          style={{ width: 44, height: 44, borderRadius: 12, background: '#fef0f0', color: '#e74c3c', border: 'none', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          −
                        </button>
                        <div style={{ minWidth: 32, textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{qty}</div>
                          <div style={{ fontSize: 10, color: '#aaa' }}>{p.unit}</div>
                        </div>
                        <button onClick={() => inc(p.id)}
                          style={{ width: 44, height: 44, borderRadius: 12, background: '#00b894', color: '#fff', border: 'none', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,184,148,0.4)' }}>
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotal when qty > 0 */}
                {qty > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e8f8f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#00b894', fontWeight: 600 }}>✓ Added to order</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#00b894' }}>{fmt(qty * Number(p.default_price))}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Cart Bar */}
        {cartCount > 0 && (
          <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 100 }}>
            <button onClick={() => setStep('cart')}
              style={{ width: '100%', padding: '18px 20px', background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', border: 'none', borderRadius: 18, fontSize: 16, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: '#00b894', borderRadius: 8, padding: '2px 10px', fontSize: 14, fontWeight: 800 }}>{cartCount}</span>
                <span>View Order</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 17 }}>{fmt(total)}</span>
                <span style={{ fontSize: 18 }}>→</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
