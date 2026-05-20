'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addChild } from '../actions';
import { AVATAR_COLORS, type AvatarColor } from '../constants';
import { Avatar } from '@/components/ui/Avatar';
import { EMOJI_AVATARS } from '@/components/ui/AvatarPicker';
import { Button } from '@/components/ui/Button';

export function AddChildForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [color, setColor] = useState<AvatarColor>('coral');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [avatarTab, setAvatarTab] = useState<'emoji' | 'color'>('emoji');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Введи имя');
    if (!/^\d{4}$/.test(pin)) return setError('PIN должен быть из 4 цифр');
    if (pin !== pinConfirm) return setError('PIN-коды не совпадают');

    startTransition(async () => {
      const ageNum = age ? parseInt(age, 10) : null;
      const result = await addChild({
        name: name.trim(),
        age: ageNum && !isNaN(ageNum) ? ageNum : null,
        color,
        emoji: emoji ?? undefined,
        pin,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/parent/children/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Имя */}
      <Field>
        <Label>Имя</Label>
        <Input
          value={name}
          onChange={setName}
          placeholder="Маша"
          disabled={isPending}
          maxLength={50}
        />
      </Field>

      {/* Возраст */}
      <Field>
        <Label>Возраст (необязательно)</Label>
        <Input
          type="number"
          value={age}
          onChange={setAge}
          placeholder="10"
          disabled={isPending}
          inputMode="numeric"
          min={1}
          max={17}
        />
        <Hint>Помогает подбирать сложность задач</Hint>
      </Field>

      {/* Аватар */}
      <Field>
        <Label>Аватар</Label>

        {/* Превью */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <Avatar name={name || '?'} color={color} avatarEmoji={emoji} size="xl" />
        </div>

        {/* Табы */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['emoji', 'color'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAvatarTab(t)}
              disabled={isPending}
              style={{
                flex: 1, padding: '7px 0',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: avatarTab === t ? 'var(--color-ink)' : 'var(--bg-surface)',
                color: avatarTab === t ? 'white' : 'var(--text-soft)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              {t === 'emoji' ? '😊 Эмодзи' : '🎨 Цвет'}
            </button>
          ))}
        </div>

        {/* Эмодзи-сетка */}
        {avatarTab === 'emoji' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {/* Нет эмодзи — показываем инициал */}
            <button
              type="button"
              onClick={() => setEmoji(null)}
              aria-label="Инициал"
              aria-pressed={!emoji}
              disabled={isPending}
              style={{
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${!emoji ? 'var(--color-coral)' : 'transparent'}`,
                background: !emoji ? 'var(--color-coral-soft)' : 'var(--bg-surface)',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Avatar name={name || '?'} color={color} size="sm" />
            </button>
            {EMOJI_AVATARS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setEmoji(em)}
                aria-label={em}
                aria-pressed={emoji === em}
                disabled={isPending}
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${emoji === em ? 'var(--color-coral)' : 'transparent'}`,
                  background: emoji === em ? 'var(--color-coral-soft)' : 'var(--bg-surface)',
                  fontSize: 24, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {em}
              </button>
            ))}
          </div>
        )}

        {/* Цвета */}
        {avatarTab === 'color' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={c === color}
                disabled={isPending}
                style={{
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: 3,
                  borderRadius: '100px',
                  boxShadow: c === color
                    ? '0 0 0 3px var(--color-coral)'
                    : '0 0 0 1px var(--border-default)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <Avatar name={name || '?'} color={c} size="md" />
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* PIN */}
      <Field>
        <Label>PIN-код (4 цифры)</Label>
        <Input
          type="password"
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
          placeholder="• • • •"
          disabled={isPending}
          maxLength={4}
          inputMode="numeric"
          autoComplete="off"
        />
        <Hint>Чтобы войти в режим ребёнка, родитель вводит этот PIN</Hint>
      </Field>

      {/* PIN confirm */}
      <Field>
        <Label>Подтверди PIN</Label>
        <Input
          type="password"
          value={pinConfirm}
          onChange={(v) => setPinConfirm(v.replace(/\D/g, '').slice(0, 4))}
          placeholder="• • • •"
          disabled={isPending}
          maxLength={4}
          inputMode="numeric"
          autoComplete="off"
        />
      </Field>

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--status-danger-soft)',
            color: 'var(--status-danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13.5,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <Button type="submit" variant="ink" size="lg" fullWidth disabled={isPending}>
        {isPending ? 'Создаём…' : 'Создать профиль'}
      </Button>
    </form>
  );
}

// ─── Локальные UI-помощники (чтобы не плодить файлов) ────────────────
function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 18 }}>{children}</div>;
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
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = 'text',
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
  autoComplete?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        fontFamily: 'inherit',
        fontSize: 14.5,
        color: 'var(--text-primary)',
      }}
      {...rest}
    />
  );
}
