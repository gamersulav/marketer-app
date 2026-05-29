import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

export default function Settings() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', unit: 'pcs', default_price: '' });
  const [saving, setSaving] = useState(false);

  // Payment QR state
  const [qrImage, setQrImage]   = useState(null);   // base64 data URL
  const [qrLabel, setQrLabel]   = useState('');
  const [qrSaving, setQrSaving] = useState(false);
  const [qrSaved, setQrSaved]   = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch('/api/products').then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => d && setProducts(d));

    // Load existing QR settings
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.payment_qr)       setQrImage(s.payment_qr);
      if (s.payment_qr_label) setQrLabel(s.payment_qr_label);
    }).catch(() => {});
  }, [router]);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setQrImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function saveQr() {
    setQrSaving(true);
    await Promise.all([
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'payment_qr', value: qrImage || '' }) }),
      fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'payment_qr_label', value: qrLabel }) }),
    ]);
    setQrSaving(false);
    setQrSaved(true);
    setTimeout(() => setQrSaved(false), 2000);
  }

  async function removeQr() {
    setQrImage(null);
    await Promise.all([
      fetch('/api/settings?key=payment_qr', { method: 'DELETE' }),
      fetch('/api/settings?key=payment_qr_label', { method: 'DELETE' }),
    ]);
  }

  async function addProduct(e) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const product = await r.json();
    setProducts(prev => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ name: '', unit: 'pcs', default_price: '' });
    setSaving(false);
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  return (
    <>
      <Head><title>Settings — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '16px', color: '#fff' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8, padding: 0 }}>← Back</button>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>⚙️ Settings</h1>
          <p style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Payment QR & product catalog</p>
        </div>

        <div style={{ padding: '16px' }}>

          {/* Payment QR section */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💳 Payment QR Code</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
              Upload your eSewa / Khalti / IME Pay QR. It will be included as a link in every bill sent on WhatsApp so shops can scan and pay directly.
            </p>

            {/* Label */}
            <input
              type="text"
              placeholder="Label (e.g. Pay via eSewa)"
              value={qrLabel}
              onChange={e => setQrLabel(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
            />

            {/* QR preview or upload */}
            {qrImage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <img src={qrImage} alt="Payment QR" style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 6 }}>QR uploaded ✓</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ flex: 1, padding: '8px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 13, color: '#333', cursor: 'pointer' }}>
                      Change
                    </button>
                    <button onClick={removeQr}
                      style={{ padding: '8px 12px', background: '#fef0f0', border: 'none', borderRadius: 8, fontSize: 13, color: '#e74c3c', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                style={{ width: '100%', padding: '32px 12px', background: '#f8f9fb', border: '2px dashed #d0d5dd', borderRadius: 10, fontSize: 14, color: '#555', cursor: 'pointer', marginBottom: 10 }}>
                📷 Tap to upload QR image
              </button>
            )}

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveQr} disabled={qrSaving || !qrImage}
                style={{ flex: 1, padding: '11px', background: qrSaved ? '#27ae60' : (qrSaving || !qrImage) ? '#aaa' : '#0f3460', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {qrSaved ? '✓ Saved!' : qrSaving ? 'Saving...' : 'Save QR'}
              </button>
              {qrImage && (
                <a href="/pay" target="_blank"
                  style={{ padding: '11px 14px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 13, color: '#333', textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                  Preview ↗
                </a>
              )}
            </div>
          </div>

          {/* Product catalog */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Add Product to Catalog</h3>
            <form onSubmit={addProduct}>
              <input type="text" placeholder="Product name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 8, outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  style={{ padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, background: '#fff' }}>
                  {['pcs', 'dozen', 'box', 'pack', 'roll', 'set', 'kg', 'm'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" placeholder="Default price" value={form.default_price} onChange={e => setForm(p => ({ ...p, default_price: e.target.value }))} min="0" step="any"
                  style={{ padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
              <button type="submit" disabled={saving}
                style={{ width: '100%', padding: '12px', background: saving ? '#aaa' : '#0f3460', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600 }}>
                {saving ? 'Adding...' : 'Add Product'}
              </button>
            </form>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 13, color: '#444' }}>
              Product Catalog ({products.length})
            </div>
            {products.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: 14 }}>
                No products yet. Add products above to use them as quick-pick when creating bills.
              </div>
            )}
            {products.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: i < products.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>per {p.unit} · {fmt(p.default_price)}</div>
                </div>
                <button onClick={() => deleteProduct(p.id)} style={{ background: '#fef0f0', border: 'none', color: '#e74c3c', borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
