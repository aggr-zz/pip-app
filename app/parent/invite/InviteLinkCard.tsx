'use client';

import { useState, useTransition } from 'react';
import { createFamilyInvite } from '@/app/invite-family/[token]/inviteActions';

export function InviteLinkCard() {
  const [isPending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await createFamilyInvite();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const url = `${window.location.origin}/invite-family/${result.token}`;
      setInviteUrl(url);
    });
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  const qrSrc = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(inviteUrl)}`
    : null;

  return (
    <section
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '18px 16px',
        marginBottom: 8,
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: inviteUrl ? 14 : 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,183,77,0.15)',
            color: '#c47f00',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          👨‍👩‍👧
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>Пригласить второго родителя</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 1 }}>
            Папа и мама смогут управлять семьёй вместе
          </div>
        </div>
        {!inviteUrl && (
          <button
            onClick={handleGenerate}
            disabled={isPending}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-coral)',
              color: 'white',
              fontWeight: 600,
              fontSize: 12.5,
              border: 'none',
              cursor: isPending ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? '…' : 'Создать ссылку'}
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: 'var(--status-danger-soft)',
            color: 'var(--status-danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12.5,
          }}
        >
          {error}
        </div>
      )}

      {inviteUrl && (
        <>
          {/* QR + copy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* QR code */}
            <div
              style={{
                flexShrink: 0,
                width: 96,
                height: 96,
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid var(--border-soft)',
                background: 'white',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc!} alt="QR код инвайта" width={96} height={96} style={{ display: 'block' }} />
            </div>

            {/* URL + copy button */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--text-soft)',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                  padding: '7px 9px',
                  background: 'var(--bg-surface-2)',
                  borderRadius: 8,
                  marginBottom: 8,
                  border: '1px solid var(--border-soft)',
                }}
              >
                {inviteUrl}
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
                  fontSize: 12.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Скопировано!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Скопировать ссылку
                  </>
                )}
              </button>
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
            Ссылка действительна 7 дней · Одноразовая · Только для одного человека
          </p>

          {/* Regenerate */}
          <button
            onClick={() => { setInviteUrl(null); setCopied(false); }}
            style={{
              marginTop: 8,
              padding: '6px 0',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 11.5,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Создать новую ссылку
          </button>
        </>
      )}
    </section>
  );
}
