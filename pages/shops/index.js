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
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#eaecf2', paddingBottom: 80 }}>
        <div style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #0f3460 100%)', padding: '20px 18px 16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>🏪 Shops</h1>
            <button onClick={() => setAdding(a => !a)} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
              {adding ? 'Cancel' : '+ Add'}
            </button>
          </div>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search shops..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 14 }} />
        </div>

        {adding && (
          <form onSubmit={addShop} style={{ background: '#fff', margin: '14px 14px 0', borderRadius: 16, padding: '18px', boxShadow: '0 2px 16px rgba(15,52,96,0.08)' }}>
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
              style={{ width: '100%', padding: '13px', background: saving ? '#aaa' : '#0f3460', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 14px rgba(15,52,96,0.35)' }}>
              {saving ? 'Saving...' : 'Add Shop'}
            </button>
          </form>
        )}

        <div style={{ padding: '14px' }}>
          {filtered.length === 0 && !adding && (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2.5rem', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(15,52,96,0.07)' }}>
              {filter ? 'No shops match.' : 'No shops yet. Add your first shop.'}
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(15,52,96,0.07)' }}>
            {filtered.map((s, i) => (
              <Link key={s.id} href={`/shops/${s.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{s.name}</div>
                    {s.owner && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{s.owner}{s.phone ? ` · ${s.phone}` : ''}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {s.outstanding > 0
                      ? <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>{fmt(s.outstanding)}</div>
                      : <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Clear</div>}
                    <div style={{ fontSize: 13, color: '#d1d5db', marginTop: 2 }}>›</div>
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
