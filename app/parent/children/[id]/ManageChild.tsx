'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { editChild, resetChildPin, archiveChild } from '../actions';

interface Props {
  childId: string;
  name: string;
  age: number | null;
}

export function ManageChild({ childId, name: initialName, age: initialAge }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(initialName);
  const [age, setAge] = useState<string>(initialAge != null ? String(initialAge) : '');
  const [pin, setPin] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function flash(msg: string) {
    setOkMsg(msg);
    setTimeout(() => setOkMsg(null), 2500);
  }

  function saveProfile() {
    setError(null);
    start(async () => {
      const ageNum = age.trim() === '' ? null : Number(age);
      const res = await editChild({ childId, name, age: Number.isNaN(ageNum as number) ? null : ageNum });
      if (!res.ok) { setError(res.error); return; }
      flash('Сохранено');
      router.refresh();
    });
  }

  function savePin() {
    setError(null);
    start(async () => {
      const res = await resetChildPin({ childId, pin });
      if (!res.ok) { setError(res.error); return; }
      setPin('');
      flash('PIN обновлён');
    });
  }

  function doArchive() {
    setError(null);
    start(async () => {
      const res = await archiveChild({ childId });
      if (!res.ok) { setError(res.error); return; }
      router.push('/parent');
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 12,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-xl)',
          padding: '14px 16px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 38, height: 38, borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-2)', color: 'var(--text-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>Настройки профиля</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
            Имя, возраст, PIN, архивация
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, backdropFilter: 'blur(2px)' }}
          />
          <div
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
              background: 'var(--bg-page)', borderRadius: '20px 20px 0 0',
              padding: '20px 20px calc(24px + env(safe-area-inset-bottom))',
              maxHeight: '90vh', overflowY: 'auto',
              maxWidth: 480, margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border-default)' }} />
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, margin: '0 0 18px' }}>
              Настройки профиля
            </h2>

            {error && (
              <div style={{ background: 'var(--status-danger-soft)', color: 'var(--status-danger)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13.5, marginBottom: 12 }}>
                {error}
              </div>
            )}
            {okMsg && (
              <div style={{ background: 'var(--color-mint-soft)', color: 'var(--color-mint-deep)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13.5, marginBottom: 12 }}>
                {okMsg}
              </div>
            )}

            {/* Имя + возраст */}
            <label style={labelStyle}>Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={pending} style={inputStyle} placeholder="Имя ребёнка" />
            <label style={labelStyle}>Возраст (необязательно)</label>
            <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))} disabled={pending} style={inputStyle} placeholder="например, 8" inputMode="numeric" />
            <button onClick={saveProfile} disabled={pending} style={primaryBtn}>
              {pending ? 'Сохраняем…' : 'Сохранить имя и возраст'}
            </button>

            <div style={{ height: 1, background: 'var(--border-soft)', margin: '20px 0' }} />

            {/* Сброс PIN */}
            <label style={labelStyle}>Новый PIN (4 цифры)</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={pending}
              style={inputStyle}
              placeholder="••••"
              inputMode="numeric"
            />
            <button onClick={savePin} disabled={pending || pin.length !== 4} style={secondaryBtn}>
              Сменить PIN
            </button>

            <div style={{ height: 1, background: 'var(--border-soft)', margin: '20px 0' }} />

            {/* Архивация */}
            {!confirmArchive ? (
              <button onClick={() => setConfirmArchive(true)} disabled={pending} style={dangerBtn}>
                Архивировать ребёнка
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 13.5, color: 'var(--text-soft)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Профиль скроется из дашборда и назначения задач. История и баланс сохранятся. Точно?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmArchive(false)} disabled={pending} style={{ ...secondaryBtn, flex: 1, marginTop: 0 }}>
                    Отмена
                  </button>
                  <button onClick={doArchive} disabled={pending} style={{ ...dangerBtn, flex: 1, marginTop: 0 }}>
                    {pending ? 'Архивируем…' : 'Да, архивировать'}
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => setOpen(false)} disabled={pending} style={{ ...secondaryBtn, marginTop: 16 }}>
              Закрыть
            </button>
          </div>
        </>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-soft)',
  textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
  padding: '12px 14px', fontFamily: 'inherit', fontSize: 14.5, color: 'var(--text-primary)',
  marginBottom: 14,
};
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: 'var(--radius-lg)', border: 'none',
  background: 'var(--color-ink)', color: 'white', fontFamily: 'inherit', fontWeight: 700,
  fontSize: 15, cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-default)', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
  cursor: 'pointer', marginTop: 10,
};
const dangerBtn: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--status-danger)', background: 'var(--status-danger-soft)',
  color: 'var(--status-danger)', fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
  cursor: 'pointer',
};
