import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { BottomNav } from './index';

function waPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return '977' + digits.replace(/^0/, '');
}

function buildMessage(shop, baseUrl) {
  const link = `${baseUrl}/order/${shop.order_token}`;
  return [
    `Good morning ${shop.name}! 👋`,
    ``,
    `Please send your order for today through your link:`,
    ``,
    `🛍️ ${link}`,
    ``,
    `We'll deliver today! 📦`,
  ].join('\n');
}

export default function Broadcast() {
  const router = useRouter();
  const [shops, setShops] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Sending flow state
  const [sending, setSending] = useState(false);
  const [queue, setQueue] = useState([]);   // array of shop objects to send to
  const [sentCount, setSentCount] = useState(0);
  const [done, setDone] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
    fetch('/api/shops').then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => {
      if (!d) return;
      const withToken = d.filter(s => s.order_token);
      setShops(withToken);
      // Pre-select all by default
      setSelected(new Set(withToken.map(s => s.id)));
      setLoading(false);
    });
  }, [router]);

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.owner || '').toLowerCase().includes(search.toLowerCase())
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id));

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(s => next.add(s.id));
        return next;
      });
    }
  }

  const selectedShops = shops.filter(s => selected.has(s.id));

  function startSending() {
    if (!selectedShops.length) return;
    setQueue([...selectedShops]);
    setSentCount(0);
    setDone(false);
    setSending(true);
    // Open first immediately
    openNext([...selectedShops], 0);
  }

  function openNext(q, index) {
    const shop = q[index];
    const msg = buildMessage(shop, baseUrl);
    const encoded = encodeURIComponent(msg);
    const phone = waPhone(shop.phone);
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    setSentCount(index + 1);
    if (index + 1 >= q.length) setDone(true);
  }

  function sendNext() {
    openNext(queue, sentCount);
  }

  function reset() {
    setSending(false);
    setQueue([]);
    setSentCount(0);
    setDone(false);
  }

  // ── SENDING SCREEN ──
  if (sending) {
    const remaining = queue.length - sentCount;
    const current = sentCount < queue.length ? queue[sentCount] : null;
    const prev = sentCount > 0 ? queue[sentCount - 1] : null;

    return (
      <>
        <Head><title>Sending — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
        <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#eaecf2', paddingBottom: 32 }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #0f3460 100%)', padding: '20px 16px', color: '#fff' }}>
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Sending order requests</div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>
              {done ? '✅ All Done!' : `📢 ${sentCount} of ${queue.length} sent`}
            </h1>
          </div>

          {/* Progress Bar */}
          <div style={{ height: 6, background: '#e0e0e0' }}>
            <div style={{ height: '100%', background: '#25D366', width: `${(sentCount / queue.length) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>

          <div style={{ padding: '20px 16px' }}>
            {done ? (
              /* Done state */
              <div style={{ background: '#fff', borderRadius: 16, padding: '32px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
                  All {queue.length} messages sent!
                </div>
                <div style={{ fontSize: 14, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
                  Your shops have received their order request links. Orders will come in as they place them.
                </div>
                <button onClick={reset}
                  style={{ width: '100%', padding: '14px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700 }}>
                  Back to Broadcast
                </button>
              </div>
            ) : (
              <>
                {/* Last sent */}
                {prev && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 16, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Sent to {prev.name}</div>
                      {!prev.phone && <div style={{ fontSize: 12, color: '#16a34a' }}>No phone — contact picker opened</div>}
                    </div>
                  </div>
                )}

                {/* Next shop card */}
                {current && (
                  <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '2px solid #25D366' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#25D366', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Next up — {remaining} remaining
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>{current.name}</div>
                    {current.owner && <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>{current.owner}</div>}
                    {current.phone
                      ? <div style={{ fontSize: 14, color: '#25D366', fontWeight: 600 }}>📱 {current.phone}</div>
                      : <div style={{ fontSize: 13, color: '#e67e22' }}>⚠️ No phone — WhatsApp contact picker will open</div>}

                    {/* Message preview */}
                    <div style={{ marginTop: 14, background: '#f0f4ff', borderRadius: 10, padding: '12px', fontSize: 12, color: '#555', lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {buildMessage(current, baseUrl)}
                    </div>
                  </div>
                )}

                <button onClick={sendNext}
                  style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', border: 'none', borderRadius: 16, fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 20px rgba(37,211,102,0.35)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Send to {current?.name} →
                </button>

                <button onClick={reset}
                  style={{ width: '100%', marginTop: 10, padding: '12px', background: 'transparent', border: '1.5px solid #ddd', borderRadius: 16, fontSize: 14, color: '#888', fontWeight: 600 }}>
                  Stop Sending
                </button>
              </>
            )}

            {/* Shop queue */}
            <div style={{ background: '#fff', borderRadius: 16, marginTop: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(15,52,96,0.07)' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                All {queue.length} shops
              </div>
              {queue.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < queue.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: i < sentCount ? '#25D366' : i === sentCount ? '#0f3460' : '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                    {i < sentCount ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: i === sentCount ? 700 : 400, color: i < sentCount ? '#aaa' : '#1a1a2e' }}>{s.name}</span>
                  </div>
                  {!s.phone && <span style={{ fontSize: 11, color: '#e67e22' }}>no phone</span>}
                  {i < sentCount && <span style={{ fontSize: 12, color: '#25D366', fontWeight: 600 }}>sent</span>}
                  {i === sentCount && !done && <span style={{ fontSize: 12, color: '#0f3460', fontWeight: 600 }}>next</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── SELECTION SCREEN ──
  return (
    <>
      <Head><title>Broadcast — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#eaecf2', paddingBottom: 100 }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #0f3460 100%)', padding: '16px', color: '#fff' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>📢 Send Order Request</h1>
          <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 14 }}>
            Select shops and send them their ordering link on WhatsApp.
          </p>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shops..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 12px', fontSize: 14 }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading shops...</div>
        ) : (
          <div style={{ padding: '12px' }}>

            {/* Select All row */}
            <div onClick={toggleAll}
              style={{ background: '#fff', borderRadius: 16, padding: '13px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 16px rgba(15,52,96,0.07)', cursor: 'pointer', border: '1.5px solid #e0e0e0' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: allFilteredSelected ? '#0f3460' : '#f0f0f0', border: `2px solid ${allFilteredSelected ? '#0f3460' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {allFilteredSelected && <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>✓</span>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>{filtered.length} shops</span>
            </div>

            {/* Shop list */}
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(15,52,96,0.07)' }}>
              {filtered.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', fontSize: 14 }}>No shops found.</div>
              )}
              {filtered.map((s, i) => {
                const isSelected = selected.has(s.id);
                return (
                  <div key={s.id} onClick={() => toggle(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: i < filtered.length - 1 ? '1px solid #f5f5f5' : 'none', cursor: 'pointer', background: isSelected ? '#fafbff' : '#fff', transition: 'background 0.1s' }}>
                    {/* Checkbox */}
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: isSelected ? '#0f3460' : '#f0f0f0', border: `2px solid ${isSelected ? '#0f3460' : '#ddd'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
                    </div>

                    {/* Shop info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{s.name}</div>
                      {s.owner && <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{s.owner}</div>}
                    </div>

                    {/* Phone / no-phone */}
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {s.phone
                        ? <div style={{ fontSize: 12, color: '#25D366', fontWeight: 600 }}>📱 {s.phone}</div>
                        : <div style={{ fontSize: 11, color: '#e67e22' }}>⚠️ no phone</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No phone warning */}
            {selectedShops.some(s => !s.phone) && (
              <div style={{ background: '#fff8f0', border: '1.5px solid #ffd9a8', borderRadius: 10, padding: '10px 14px', marginTop: 10, fontSize: 13, color: '#e67e22' }}>
                ⚠️ Some selected shops have no phone number. WhatsApp will open a contact picker for those.
              </div>
            )}

            {/* Message preview */}
            {selectedShops.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '14px', marginTop: 10, boxShadow: '0 2px 16px rgba(15,52,96,0.07)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                  Message preview ({selectedShops[0].name})
                </div>
                <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '12px', fontSize: 13, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                  {buildMessage(selectedShops[0], baseUrl)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Action Bar */}
        {selectedShops.length > 0 && (
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, background: '#fff', borderTop: '1px solid #eee', padding: '14px 16px', zIndex: 100 }}>
            <button onClick={startSending}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Send to {selectedShops.length} Shop{selectedShops.length > 1 ? 's' : ''} via WhatsApp
            </button>
          </div>
        )}

        <BottomNav active="broadcast" />
      </div>
    </>
  );
}
