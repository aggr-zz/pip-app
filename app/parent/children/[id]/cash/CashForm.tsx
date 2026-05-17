'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordCashPayout } from './actions';
import { Button } from '@/components/ui/Button';
import { CoinDot } from '@/components/ui/Coin';

export function CashForm({
  childId,
  childName,
  currentBalance,
}: {
  childId: string;
  childName: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const [pipStr, setPipStr] = useState('');
  const [cashStr, setCashStr] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ cash: number; pip: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const pipNum = Number(pipStr) || 0;
  const cashNum = Number(cashStr) || 0;
  const balanceAfter = currentBalance - pipNum;
  const isValid = pipNum > 0 && cashNum > 0 && pipNum <= currentBalance;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pipNum <= 0) return setError('Сколько pip списать?');
    if (cashNum <= 0) return setError('Сколько денег выдаёшь?');
    if (pipNum > currentBalance) return setError(`Не хватает: на балансе ${currentBalance} pip`);

    startTransition(async () => {
      const result = await recordCashPayout({
        profileId: childId,
        pipAmount: pipNum,
        cashAmount: cashNum,
        reason: reason.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess({ cash: cashNum, pip: pipNum });
      setPipStr('');
      setCashStr('');
      setReason('');

      // Через 3 секунды убираем баннер успеха
      setTimeout(() => setSuccess(null), 3000);

      router.refresh();
    });
  }

  // Quick presets: курс 1 pip = 1 ₽, 1 pip = 0.5 ₽, и т.п.
  function applyRate(rate: number) {
    if (pipNum > 0) {
      setCashStr(String(Math.round(pipNum * rate * 100) / 100));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {success && (
        <div
          role="status"
          style={{
            background: 'var(--color-mint-soft)',
            color: 'var(--color-mint-deep)',
            border: '1px solid var(--color-mint)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>✓</span>
          <span>
            Записано: {childName} получает <strong>{success.cash} ₽</strong> за {success.pip} pip
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <Field>
          <Label>Списать с pip</Label>
          <Input
            value={pipStr}
            onChange={(v) => setPipStr(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="100"
            disabled={isPending}
            inputMode="numeric"
            suffix={<CoinDot size={11} />}
          />
        </Field>

        <Field>
          <Label>Выдать наличными</Label>
          <Input
            value={cashStr}
            onChange={(v) => setCashStr(v.replace(/[^\d.,]/g, '').replace(',', '.'))}
            placeholder="50"
            disabled={isPending}
            inputMode="decimal"
            suffix={<span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 600 }}>₽</span>}
          />
        </Field>
      </div>

      {/* Quick rate presets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginRight: 4 }}>Курс:</span>
        {[
          { label: '1 pip = 1 ₽', rate: 1 },
          { label: '2 pip = 1 ₽', rate: 0.5 },
          { label: '5 pip = 1 ₽', rate: 0.2 },
          { label: '10 pip = 1 ₽', rate: 0.1 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyRate(preset.rate)}
            disabled={isPending || pipNum === 0}
            style={{
              padding: '4px 9px',
              fontSize: 11,
              fontWeight: 500,
              background: 'var(--bg-surface-2)',
              color: 'var(--text-soft)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-pill)',
              cursor: pipNum === 0 ? 'not-allowed' : 'pointer',
              opacity: pipNum === 0 ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Field>
        <Label>Комментарий (необязательно)</Label>
        <Input
          value={reason}
          onChange={setReason}
          placeholder="Карманные на неделю"
          disabled={isPending}
          maxLength={200}
        />
      </Field>

      {/* Live preview */}
      {pipNum > 0 && (
        <div
          style={{
            background: balanceAfter < 0 ? 'var(--status-danger-soft)' : 'var(--bg-surface-2)',
            border: `1px solid ${balanceAfter < 0 ? 'var(--status-danger)' : 'var(--border-soft)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            color: balanceAfter < 0 ? 'var(--status-danger)' : 'var(--text-soft)',
            marginTop: 6,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CoinDot size={11} />
          {balanceAfter < 0
            ? `Не хватает ${Math.abs(balanceAfter)} pip — на балансе только ${currentBalance}`
            : `После выдачи баланс ${childName} → ${balanceAfter} pip`}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--status-danger-soft)',
            color: 'var(--status-danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13.5,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant="ink"
        size="lg"
        fullWidth
        disabled={isPending || !isValid}
      >
        {isPending ? 'Записываем…' : 'Записать выдачу'}
      </Button>
    </form>
  );
}

// ─── Локальные UI-помощники ──────────────────────────────────────────
function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--text-soft)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  inputMode,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  inputMode?: 'numeric' | 'decimal' | 'text';
  suffix?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        paddingRight: suffix ? 12 : 0,
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete="off"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          padding: '11px 14px',
          fontFamily: 'inherit',
          fontSize: 14.5,
          color: 'var(--text-primary)',
          outline: 'none',
          minWidth: 0,
        }}
      />
      {suffix && <div style={{ display: 'flex', alignItems: 'center' }}>{suffix}</div>}
    </div>
  );
}
