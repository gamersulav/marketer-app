import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Setup() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', name: '', setup_key: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    const r = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setLoading(false);
    if (r.ok) { setMsg('Account created! Go to /login'); }
    else { setMsg(d.error || 'Error'); }
  }

  return (
    <>
      <Head><title>Setup — MarketRun</title></Head>
      <div style={{ maxWidth: 400, margin: '60px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Initial Setup</h1>
        <form onSubmit={submit}>
          {[
            { key: 'name', placeholder: 'Your full name' },
            { key: 'username', placeholder: 'Username' },
            { key: 'password', placeholder: 'Password', type: 'password' },
            { key: 'setup_key', placeholder: 'Setup key' },
          ].map(f => (
            <input key={f.key} type={f.type || 'text'} placeholder={f.placeholder} value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required
              style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, marginBottom: 10, outline: 'none' }} />
          ))}
          {msg && <p style={{ color: msg.includes('created') ? '#27ae60' : '#e74c3c', marginBottom: 10 }}>{msg}</p>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600 }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        {msg.includes('created') && (
          <button onClick={() => router.push('/login')} style={{ width: '100%', marginTop: 10, padding: '12px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600 }}>
            Go to Login →
          </button>
        )}
      </div>
    </>
  );
}
