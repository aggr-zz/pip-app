'use client';

import { useState } from 'react';

type Props = {
  joinUrl: string;
  childName: string;
  pin: string;
};

export function JoinLinkCard({ joinUrl, childName, pin }: Props) {
  const [copied, setCopied] = useState(false);

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(joinUrl)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text in input
    }
  }

  return (
    <section
      style={{
        marginTop: 12,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '18px 16px',
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-coral-soft)',
            color: 'var(--color-coral-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          📲
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>Как {childName} войдёт</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 1 }}>
            Со своего телефона: открыть ссылку или QR и ввести PIN
          </div>
        </div>
      </div>

      {/* PIN — назвать ребёнку */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: 'var(--color-gold-soft)',
          border: '1px solid var(--color-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 14px',
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-gold-deep)' }}>
            PIN для входа
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 1 }}>
            назови его ребёнку
          </div>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '0.22em',
            color: 'var(--color-gold-deep)',
          }}
        >
          {pin}
        </div>
      </div>

      {/* QR + copy */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* QR code */}
        <div
          style={{
            flexShrink: 0,
            width: 100,
            height: 100,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--border-soft)',
            background: 'white',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="QR код для входа"
            width={100}
            height={100}
            style={{ display: 'block' }}
          />
        </div>

        {/* URL + buttons */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-soft)',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              lineHeight: 1.45,
              padding: '8px 10px',
              background: 'var(--bg-surface-2)',
              borderRadius: 8,
              marginBottom: 10,
              border: '1px solid var(--border-soft)',
            }}
          >
            {joinUrl}
          </div>

          <button
            onClick={handleCopy}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 'var(--radius-lg)',
              background: copied ? 'var(--color-mint-soft)' : 'var(--bg-surface-2)',
              border: copied
                ? '1px solid var(--color-mint)'
                : '1px solid var(--border-default)',
              color: copied ? 'var(--color-mint-deep)' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Скопировано!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Скопировать ссылку
              </>
            )}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
        Ребёнок откроет ссылку со своего телефона, введёт этот PIN и попадёт на свой экран. PIN можно сменить в «Управление профилем».
      </p>
    </section>
  );
}
