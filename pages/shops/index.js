import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { BottomNav } from '../index';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

export default function Shops() {
  const router = useRouter();
  const [shops, setShops] = useState([]);
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', owner: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/shops').then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => d && setShops(d));
  }, [router]);

  const filtered = shops.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || (s.owner || '').toLowerCase().includes(filter.toLowerCase()));

  async function addShop(e) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch('/api/shops', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const shop = await r.json();
    setShops(prev => [shop, ...prev]);
    setForm({ name: '', owner: '', phone: '', address: '' });
    setAdding(false);
    setSaving(false);
  }

  return (
    <>
      <Head><title>Shops — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 72 }}>
        <div style={{ background: 'linear-gradient(135deg, #8e44ad, #6c3483)', padding: '16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>🏪 Shops</h1>
            <button onClick={() => setAdding(a => !a)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 600 }}>
              {adding ? 'Cancel' : '+ Add'}
            </button>
          </div>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search shops..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 12px', fontSize: 14 }} />
        </div>

        {adding && (
          <form onSubmit={addShop} style={{ background: '#fff', margin: '12px 12px 0', borderRadius: 12, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>New Shop</h3>
            {[
              { key: 'name', placeholder: 'Shop name *', required: true },
              { key: 'owner', placeholder: 'Owner name' },
              { key: 'phone', placeholder: 'Phone number', type: 'tel' },
              { key: 'address', placeholder: 'Address' },
            ].map(f => (
              <input key={f.key} type={f.type || 'text'} placeholder={f.placeholder} required={f.required}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 8, outline: 'none' }} />
            ))}
            <button type="submit" disabled={saving}
              style={{ width: '100%', padding: '12px', background: saving ? '#aaa' : '#8e44ad', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600 }}>
              {saving ? 'Saving...' : 'Add Shop'}
            </button>
          </form>
        )}

        <div style={{ padding: '12px' }}>
          {filtered.length === 0 && !adding && (
            <div style={{ textAlign: 'center', color: '#888', padding: '2rem', background: '#fff', borderRadius: 12 }}>
              {filter ? 'No shops match.' : 'No shops yet. Add your first shop.'}
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {filtered.map((s, i) => (
              <Link key={s.id} href={`/shops/${s.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                    {s.owner && <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{s.owner}{s.phone ? ` · ${s.phone}` : ''}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {s.outstanding > 0
                      ? <div style={{ fontWeight: 700, color: '#e74c3c', fontSize: 14 }}>{fmt(s.outstanding)}</div>
                      : <div style={{ fontSize: 12, color: '#27ae60', fontWeight: 600 }}>✓ Clear</div>}
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>›</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <BottomNav active="shops" />
      </div>
    </>
  );
}
