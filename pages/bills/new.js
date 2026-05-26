import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

const EMPTY_ITEM = () => ({ id: Date.now(), product_name: '', unit: 'pcs', qty: '1', unit_price: '' });

export default function NewBill() {
  const router = useRouter();
  const { shop: prefillShopId } = router.query;

  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [shopId, setShopId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(null); // index of item being edited
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(d => { setShops(d); if (prefillShopId) setShopId(String(prefillShopId)); });
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, [prefillShopId]);

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit_price) || 0), 0);
  const paidAmt = Number(paid) || 0;
  const due = Math.max(0, total - paidAmt);

  function updateItem(index, key, val) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: val } : item));
  }

  function removeItem(index) {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems(prev => [...prev, EMPTY_ITEM()]);
  }

  function pickProduct(index, product) {
    setItems(prev => prev.map((item, i) => i === index
      ? { ...item, product_name: product.name, unit: product.unit, unit_price: String(product.default_price) }
      : item
    ));
    setShowProductPicker(null);
    setProductSearch('');
  }

  async function submit(e) {
    e.preventDefault();
    if (!shopId) { setError('Select a shop'); return; }
    const validItems = items.filter(i => i.product_name && Number(i.qty) > 0 && Number(i.unit_price) > 0);
    if (!validItems.length) { setError('Add at least one item with name, qty, and price'); return; }
    setSaving(true);
    setError('');
    const r = await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: shopId, delivery_date: deliveryDate, items: validItems, paid: paidAmt, note }),
    });
    if (r.ok) {
      const d = await r.json();
      router.push(`/bills/${d.id}`);
    } else {
      const d = await r.json();
      setError(d.error || 'Failed to save');
      setSaving(false);
    }
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <>
      <Head><title>New Bill — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 24 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '16px', color: '#fff' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8, padding: 0 }}>← Back</button>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>🧾 New Delivery Bill</h1>
        </div>

        <form onSubmit={submit} style={{ padding: '12px' }}>
          {/* Shop + Date */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>SHOP *</label>
            <select value={shopId} onChange={e => setShopId(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, background: '#fff', marginBottom: 10 }}>
              <option value="">Select shop...</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}{s.outstanding > 0 ? ` (Due: ${fmt(s.outstanding)})` : ''}</option>)}
            </select>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>DATE</label>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14 }} />
          </div>

          {/* Items */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Items</span>
              <button type="button" onClick={addItem} style={{ background: '#0f3460', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 600 }}>+ Add Row</button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} style={{ borderBottom: index < items.length - 1 ? '1px solid #f5f5f5' : 'none', paddingBottom: 12, marginBottom: 12 }}>
                {/* Product name with picker */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input type="text" placeholder="Product name *" value={item.product_name}
                    onChange={e => updateItem(index, 'product_name', e.target.value)}
                    style={{ flex: 1, padding: '9px 10px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
                  {products.length > 0 && (
                    <button type="button" onClick={() => { setShowProductPicker(index); setProductSearch(''); }}
                      style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '0 10px', fontSize: 12, color: '#555' }}>
                      📋
                    </button>
                  )}
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)}
                      style={{ background: '#fef0f0', border: 'none', borderRadius: 8, padding: '0 10px', fontSize: 14, color: '#e74c3c' }}>
                      ✕
                    </button>
                  )}
                </div>
                {/* Qty / Price / Subtotal */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, alignItems: 'center' }}>
                  <input type="number" placeholder="Qty" value={item.qty} min="0.01" step="any"
                    onChange={e => updateItem(index, 'qty', e.target.value)}
                    style={{ padding: '9px 10px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
                  <input type="number" placeholder="Unit price" value={item.unit_price} min="0" step="any"
                    onChange={e => updateItem(index, 'unit_price', e.target.value)}
                    style={{ padding: '9px 10px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f3460', minWidth: 70, textAlign: 'right' }}>
                    {fmt((Number(item.qty) || 0) * (Number(item.unit_price) || 0))}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #f0f0f0', paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#0f3460' }}>{fmt(total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>PAID NOW (leave blank if full credit)</label>
            <input type="number" placeholder="0" value={paid} onChange={e => setPaid(e.target.value)} min="0" step="any"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, marginBottom: 8, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button type="button" onClick={() => setPaid('0')} style={{ flex: 1, padding: '8px', background: '#fef0f0', border: 'none', borderRadius: 8, fontSize: 12, color: '#e74c3c', fontWeight: 600 }}>All Credit</button>
              <button type="button" onClick={() => setPaid(String(total))} style={{ flex: 1, padding: '8px', background: '#f0fef4', border: 'none', borderRadius: 8, fontSize: 12, color: '#27ae60', fontWeight: 600 }}>Full Cash</button>
            </div>
            {total > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', background: due > 0 ? '#fef9f0' : '#f0fef4', borderRadius: 8, padding: '10px 12px' }}>
                <span style={{ fontSize: 13, color: '#666' }}>Due after this bill:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: due > 0 ? '#e67e22' : '#27ae60' }}>{fmt(due)}</span>
              </div>
            )}
          </div>

          {/* Note */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>NOTE (optional)</label>
            <input type="text" placeholder="e.g. Delivered by bike, extra charge" value={note} onChange={e => setNote(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          </div>

          {error && <div style={{ background: '#fef0f0', color: '#e74c3c', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 14 }}>{error}</div>}

          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '15px', background: saving ? '#aaa' : '#0f3460', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700 }}>
            {saving ? 'Saving Bill...' : `Save Bill — ${fmt(total)}`}
          </button>
        </form>

        {/* Product Picker Modal */}
        {showProductPicker !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, margin: '0 auto', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Pick Product</span>
                <button onClick={() => setShowProductPicker(null)} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 14 }}>✕</button>
              </div>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <input autoFocus type="text" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => pickProduct(showProductPicker, p)}
                    style={{ padding: '13px 16px', borderBottom: '1px solid #f8f8f8', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', active: { background: '#f0f0f0' } }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>per {p.unit}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f3460', fontSize: 14 }}>{fmt(p.default_price)}</div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No products found</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
