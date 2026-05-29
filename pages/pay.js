import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PayPage() {
  const [qr, setQr]       = useState(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings?key=payment_qr').then(r => r.json()),
      fetch('/api/settings?key=payment_qr_label').then(r => r.json()),
    ]).then(([qrData, labelData]) => {
      setQr(qrData.value);
      setLabel(labelData.value || 'Scan to Pay');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>{label || 'Scan to Pay'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {qr && <meta property="og:image" content={qr} />}
        <meta property="og:title" content={label || 'Scan to Pay'} />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {loading ? (
          <div style={{ color: '#999', fontSize: 16 }}>Loading...</div>
        ) : !qr ? (
          <div style={{ textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 16 }}>No payment QR configured</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {label}
            </div>
            <img
              src={qr}
              alt="Payment QR Code"
              style={{
                width: '100%',
                maxWidth: 320,
                height: 'auto',
                borderRadius: 12,
                border: '1px solid #eee',
                display: 'block',
                margin: '0 auto',
              }}
            />
            <div style={{ marginTop: 20, fontSize: 13, color: '#888' }}>
              Open your payment app and scan the QR code above
            </div>
          </div>
        )}
      </div>
    </>
  );
}
