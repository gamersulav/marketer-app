import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

function fmt(n) { return 'Rs ' + Number(n || 0).toLocaleString('en-IN'); }

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
}

function waPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return '977' + digits.replace(/^0/, '');
}

function buildStatementMessage({ shop, deliveries }) {
  const outstanding = deliveries.filter(d => Number(d.total) - Number(d.paid) > 0);
  const total = outstanding.reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);

  const lines = [];
  lines.push(`📦 *Account Statement*`);
  lines.push(`Shop: *${shop.name}*`);
  lines.push(`As of: ${fmtDate(new Date().toISOString().slice(0, 10))}`);
  lines.push('');

  if (outstanding.length === 0) {
    lines.push('✅ No outstanding dues. All cleared!');
  } else {
    lines.push('*Outstanding Bills:*');
    for (const d of outstanding) {
      const due = Number(d.total) - Number(d.paid);
      lines.push(`• ${fmtDate(d.delivery_date)} → *${fmt(due)}* (Bill #${d.id})`);
    }
    lines.push('─────────────────────');
    lines.push(`💰 *Total Due: ${fmt(total)}*`);
    lines.push('');
    lines.push('Please clear at your earliest. Thank you 🙏');
  }

  return lines.join('\n');
}

export default function ShopDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/shops/${id}`).then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => d && setData(d));
  }, [id, router]);

  async function recordPayment(e) {
    e.preventDefault();
    if (!payAmt || Number(payAmt) <= 0) return;
    setSaving(true);
    const r = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: id, amount: Number(payAmt), note: payNote || undefined }),
    });
    const result = await r.json();
    if (result.ok) {
      setData(prev => ({ ...prev, shop: result.shop }));
      setPayAmt('');
      setPayNote('');
      setPaying(false);
      fetch(`/api/shops/${id}`).then(r => r.json()).then(setData);
    }
    setSaving(false);
  }

  function sendWhatsApp() {
    const msg = buildStatementMessage({ shop: data.shop, deliveries: data.deliveries });
    const encoded = encodeURIComponent(msg);
    const phone = waPhone(data.shop.phone);
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  }

  if (!data) return <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Loading...</div>;

  const { shop, deliveries, payments } = data;
  const outstandingDeliveries = deliveries.filter(d => Number(d.total) - Number(d.paid) > 0);

  return (
    <>
      <Head><title>{shop.name} — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', paddingBottom: 24 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', padding: '16px', color: '#fff' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8, padding: 0 }}>
            ← Back
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{shop.name}</h1>
          {shop.owner && <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{shop.owner}{shop.phone ? ` · ${shop.phone}` : ''}</p>}
          {shop.address && <p style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{shop.address}</p>}
        </div>

        {/* Outstanding Banner */}
        <div style={{ background: shop.outstanding > 0 ? '#e74c3c' : '#27ae60', color: '#fff', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Outstanding Due</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{fmt(shop.outstanding)}</div>
          </div>
          {shop.outstanding > 0 && (
            <button onClick={() => setPaying(p => !p)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 600 }}>
              {paying ? 'Cancel' : '💰 Collect'}
            </button>
          )}
          {shop.outstanding === 0 && <div style={{ fontSize: 13, fontWeight: 600 }}>✓ All Clear</div>}
        </div>

        {/* Payment Form */}
        {paying && (
          <form onSubmit={recordPayment} style={{ background: '#fff', margin: '12px', borderRadius: 12, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Record Payment</h3>
            <input type="number" placeholder={`Amount (max ${fmt(shop.outstanding)})`} value={payAmt}
              onChange={e => setPayAmt(e.target.value)} min="1" step="1"
              style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, marginBottom: 8, outline: 'none' }} required />
            <input type="text" placeholder="Note (optional)" value={payNote}
              onChange={e => setPayNote(e.target.value)}
              style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, marginBottom: 12, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setPayAmt(String(Math.floor(shop.outstanding)))}
                style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                Full Amount
              </button>
              <button type="submit" disabled={saving}
                style={{ flex: 2, padding: '10px', background: saving ? '#aaa' : '#27ae60', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        )}

        {/* Action Buttons */}
        <div style={{ padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href={`/bills/new?shop=${id}`}>
            <div style={{ background: '#0f3460', color: '#fff', borderRadius: 12, padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>🧾 Create New Delivery Bill</span>
              <span style={{ opacity: 0.7 }}>›</span>
            </div>
          </Link>

          <button onClick={sendWhatsApp}
            style={{ width: '100%', padding: '13px 16px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Send Statement on WhatsApp
            {outstandingDeliveries.length > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                {outstandingDeliveries.length} bill{outstandingDeliveries.length > 1 ? 's' : ''} due
              </span>
            )}
          </button>
        </div>

        <div style={{ padding: '4px 12px 12px' }}>
          {/* Deliveries */}
          {deliveries.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 13, color: '#444' }}>
                Delivery History ({deliveries.length})
              </div>
              {deliveries.map((d, i) => (
                <Link key={d.id} href={`/bills/${d.id}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderBottom: i < deliveries.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.delivery_date}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{d.item_count} item{d.item_count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(d.total)}</div>
                      <div style={{ fontSize: 12, color: d.total - d.paid > 0 ? '#e74c3c' : '#27ae60' }}>
                        {d.total - d.paid > 0 ? `Due: ${fmt(d.total - d.paid)}` : '✓ Paid'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 13, color: '#444' }}>
                Payment History ({payments.length})
              </div>
              {payments.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 12px', borderBottom: i < payments.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.payment_date}</div>
                    {p.note && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.note}</div>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#27ae60' }}>{fmt(p.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
