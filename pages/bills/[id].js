import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  // Nepal: strip leading 0, prefix 977
  return '977' + digits.replace(/^0/, '');
}

function buildBillMessage({ bill, billId, shopDeliveries, payLink, payLabel }) {
  const due = Math.max(0, Number(bill.total) - Number(bill.paid));

  // Previous outstanding bills (exclude current)
  const prevDues = shopDeliveries.filter(d =>
    Number(d.id) !== Number(billId) &&
    Number(d.total) - Number(d.paid) > 0
  );

  const totalDue = due + prevDues.reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);

  const lines = [];
  lines.push(`📦 *Delivery Bill — #${billId}*`);
  lines.push(`Shop: *${bill.shop_name}*`);
  lines.push(`Date: ${fmtDate(bill.delivery_date)}`);
  lines.push('');
  lines.push('*Items Delivered:*');
  for (const item of bill.items || []) {
    const qty = Number(item.qty) % 1 === 0 ? Number(item.qty) : Number(item.qty).toFixed(2);
    lines.push(`• ${item.product_name} — ${qty} ${item.unit} × ${fmt(item.unit_price)} = *${fmt(item.subtotal)}*`);
  }
  lines.push('');
  lines.push(`Bill Total: ${fmt(bill.total)}`);
  if (Number(bill.paid) > 0) lines.push(`Paid: ${fmt(bill.paid)}`);
  lines.push(`*This Bill Due: ${fmt(due)}*`);

  if (prevDues.length > 0) {
    lines.push('');
    lines.push('─────────────────────');
    lines.push('*Previous Outstanding:*');
    for (const d of prevDues) {
      const dDue = Number(d.total) - Number(d.paid);
      lines.push(`• ${fmtDate(d.delivery_date)} → *${fmt(dDue)}* (Bill #${d.id})`);
    }
  }

  lines.push('─────────────────────');
  lines.push(`💰 *Total Due: ${fmt(totalDue)}*`);
  lines.push('');
  if (payLink) {
    lines.push(`💳 *${payLabel || 'Scan to Pay'}:*`);
    lines.push(payLink);
    lines.push('');
  }
  lines.push('Please clear at your earliest. Thank you 🙏');

  return lines.join('\n');
}

export default function BillDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [bill, setBill] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payAmt, setPayAmt] = useState('');
  const [saving, setSaving] = useState(false);
  const [waSending, setWaSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/deliveries/${id}`).then(r => {
      if (r.status === 401) { router.push('/login'); return null; }
      return r.json();
    }).then(d => d && setBill(d));
  }, [id, router]);

  async function collectPayment(e) {
    e.preventDefault();
    if (!payAmt || Number(payAmt) <= 0) return;
    setSaving(true);
    const r = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: bill.shop_id, delivery_id: id, amount: Number(payAmt), note: `Payment for Bill #${id}` }),
    });
    if (r.ok) {
      fetch(`/api/deliveries/${id}`).then(r => r.json()).then(setBill);
      setPayAmt('');
      setPaying(false);
    }
    setSaving(false);
  }

  async function sendWhatsApp() {
    setWaSending(true);
    const [shopData, qrData, labelData] = await Promise.all([
      fetch(`/api/shops/${bill.shop_id}`).then(r => r.json()),
      fetch('/api/settings?key=payment_qr').then(r => r.json()),
      fetch('/api/settings?key=payment_qr_label').then(r => r.json()),
    ]);
    setWaSending(false);

    const hasQr  = !!qrData.value;
    const payLink  = hasQr ? `${window.location.origin}/pay` : null;
    const payLabel = labelData.value || 'Scan to Pay';
    const msg = buildBillMessage({ bill, billId: id, shopDeliveries: shopData.deliveries || [], payLink, payLabel });
    const encoded = encodeURIComponent(msg);
    const phone = waPhone(bill.shop_phone);
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  }

  if (!bill) return <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Loading...</div>;

  const due = Math.max(0, Number(bill.total) - Number(bill.paid));

  return (
    <>
      <Head><title>Bill #{id} — MarketRun</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: '#eaecf2', paddingBottom: 24 }}>
        <div style={{ background: 'linear-gradient(160deg, #0d1b2a 0%, #0f3460 100%)', padding: '20px 18px 16px', color: '#fff' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8, padding: 0 }}>← Back</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>Bill #{id}</h1>
              <p style={{ fontSize: 13, opacity: 0.8, marginTop: 3 }}>{bill.shop_name}</p>
              <p style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{bill.delivery_date}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: 0.75 }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(bill.total)}</div>
            </div>
          </div>
        </div>

        {/* Due / Paid Banner */}
        {due > 0 ? (
          <div style={{ background: '#e74c3c', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Amount Due</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(due)}</div>
            </div>
            <button onClick={() => setPaying(p => !p)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 600 }}>
              {paying ? 'Cancel' : '💰 Collect'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#27ae60', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>✓ Fully Paid</div>
            <div style={{ fontSize: 14 }}>Collected: {fmt(bill.paid)}</div>
          </div>
        )}

        {/* WhatsApp Button */}
        <div style={{ padding: '12px 12px 0' }}>
          <button onClick={sendWhatsApp} disabled={waSending}
            style={{ width: '100%', padding: '13px', background: waSending ? '#aaa' : '#25D366', color: '#fff', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {waSending ? 'Preparing...' : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Send Bill on WhatsApp
              </>
            )}
          </button>
        </div>

        {/* Payment Form */}
        {paying && (
          <form onSubmit={collectPayment} style={{ background: '#fff', margin: '12px', borderRadius: 16, padding: '16px', boxShadow: '0 2px 16px rgba(15,52,96,0.07)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Collect Payment</h3>
            <input type="number" placeholder={`Amount (due: ${fmt(due)})`} value={payAmt} onChange={e => setPayAmt(e.target.value)} min="1" step="1"
              style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, marginBottom: 8, outline: 'none' }} required />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setPayAmt(String(Math.floor(due)))}
                style={{ flex: 1, padding: '10px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Full</button>
              <button type="submit" disabled={saving}
                style={{ flex: 2, padding: '10px', background: saving ? '#aaa' : '#27ae60', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </form>
        )}

        {/* Bill Items */}
        <div style={{ padding: '12px' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(15,52,96,0.07)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 700, fontSize: 13, color: '#444' }}>
              Items ({bill.items?.length || 0})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '8px 12px', background: '#f8f8f8', fontSize: 11, color: '#888', fontWeight: 600 }}>
              <span>PRODUCT</span>
              <span style={{ textAlign: 'right' }}>QTY × PRICE</span>
              <span style={{ textAlign: 'right', minWidth: 70 }}>SUBTOTAL</span>
            </div>
            {(bill.items || []).map((item, i) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '10px 12px', borderBottom: i < bill.items.length - 1 ? '1px solid #f8f8f8' : 'none', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: '#aaa' }}>{item.unit}</div>
                </div>
                <div style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>{item.qty} × {fmt(item.unit_price)}</div>
                <div style={{ fontSize: 14, fontWeight: 700, textAlign: 'right', minWidth: 70 }}>{fmt(item.subtotal)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f0f4ff', borderTop: '2px solid #e8ecf8' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 17, color: '#0f3460' }}>{fmt(bill.total)}</span>
            </div>
            {bill.paid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f0fef4' }}>
                <span style={{ fontSize: 14, color: '#555' }}>Paid</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#27ae60' }}>{fmt(bill.paid)}</span>
              </div>
            )}
            {due > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fef9f0' }}>
                <span style={{ fontSize: 14, color: '#555' }}>Remaining Due</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#e74c3c' }}>{fmt(due)}</span>
              </div>
            )}
          </div>

          {bill.note && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '12px', boxShadow: '0 2px 16px rgba(15,52,96,0.07)', fontSize: 13, color: '#666' }}>
              📝 {bill.note}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
