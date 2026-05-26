import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

export default function Settings() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', unit: 'pcs', default_price: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/products').then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => d && setProducts(d));
  }, [router]);

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
          <p style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>Manage product catalog</p>
        </div>

        <div style={{ padding: '16px' }}>
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
