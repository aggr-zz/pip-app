'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createReward, type LimitType, type RewardInput } from './actions';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

// Популярные эмодзи для наград, сгруппированные
const REWARD_EMOJIS = [
  '🎬', '🍦', '🍕', '🍫', '🎮', '📱',
  '🎁', '🚲', '⚽', '🎨', '📚', '🧸',
  '💵', '🍿', '🎢', '🏖️', '🎵', '🐾',
];

type Child = {
  id: string;
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
};

export function RewardForm({ children }: { children: Child[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎁');
  const [coinCost, setCoinCost] = useState(50);
  const [limitType, setLimitType] = useState<LimitType>('unlimited');
  const [forAllChildren, setForAllChildren] = useState(true);
  const [availableTo, setAvailableTo] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleChild(childId: string) {
    setAvailableTo((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!forAllChildren && availableTo.length === 0) {
      setError('Выбери хотя бы одного ребёнка, или сделай награду для всех');
      return;
    }

    const input: RewardInput = {
      title,
      description: description.trim() || null,
      icon,
      coin_cost: coinCost,
      limit_type: limitType,
      available_to: forAllChildren ? [] : availableTo,
    };

    startTransition(async () => {
      const result = await createReward(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/parent/rewards');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Название */}
      <Field>
        <Label>Название</Label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Выбор фильма на вечер"
          disabled={isPending}
          maxLength={80}
          style={inputStyle}
        />
      </Field>

      {/* Описание */}
      <Field>
        <Label>Описание (необязательно)</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Что именно и когда"
          disabled={isPending}
          maxLength={300}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      {/* Иконка */}
      <Field>
        <Label>Иконка</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
          {REWARD_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              disabled={isPending}
              aria-pressed={emoji === icon}
              style={{
                fontSize: 22,
                padding: '8px 0',
                background: emoji === icon ? 'var(--color-gold-soft)' : 'var(--bg-surface)',
                border: `1px solid ${emoji === icon ? 'var(--color-gold-deep)' : 'var(--border-soft)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </Field>

      {/* Цена */}
      <Field>
        <Label>Цена в PIP</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <input
            type="number"
            value={coinCost}
            onChange={(e) => setCoinCost(parseInt(e.target.value) || 0)}
            min={1}
            max={100000}
            disabled={isPending}
            style={{ ...inputStyle, width: 110, fontSize: 18, fontWeight: 600, textAlign: 'right' }}
            inputMode="numeric"
          />
          <span style={{ color: 'var(--text-soft)', fontSize: 14 }}>PIP</span>
        </div>
        {/* Пресеты */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[10, 50, 100, 300, 500, 1000, 5000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setCoinCost(preset)}
              disabled={isPending}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                background: coinCost === preset ? 'var(--color-ink)' : 'var(--bg-surface)',
                color: coinCost === preset ? 'white' : 'var(--text-primary)',
                border: `1px solid ${coinCost === preset ? 'var(--color-ink)' : 'var(--border-soft)'}`,
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </Field>

      {/* Лимит */}
      <Field>
        <Label>Сколько раз можно получить</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <SegmentButton
            active={limitType === 'unlimited'}
            onClick={() => setLimitType('unlimited')}
            disabled={isPending}
          >
            Много раз
          </SegmentButton>
          <SegmentButton
            active={limitType === 'once'}
            onClick={() => setLimitType('once')}
            disabled={isPending}
          >
            Только один раз
          </SegmentButton>
        </div>
        <Hint>
          «Один раз» — для крупных целей: велосипед, телефон. После получения исчезнет из магазина у этого ребёнка.
        </Hint>
      </Field>

      {/* Кому доступна */}
      {children.length > 1 && (
        <Field>
          <Label>Кому доступна</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <SegmentButton
              active={forAllChildren}
              onClick={() => setForAllChildren(true)}
              disabled={isPending}
            >
              Всем
            </SegmentButton>
            <SegmentButton
              active={!forAllChildren}
              onClick={() => setForAllChildren(false)}
              disabled={isPending}
            >
              Выбрать
            </SegmentButton>
          </div>
          {!forAllChildren && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChild(c.id)}
                  disabled={isPending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px 5px 5px',
                    background: availableTo.includes(c.id) ? 'var(--color-coral-soft)' : 'var(--bg-surface)',
                    border: `1px solid ${availableTo.includes(c.id) ? 'var(--color-coral)' : 'var(--border-soft)'}`,
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <Avatar name={c.name} color={c.avatar_color} size="xs" />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </Field>
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
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <Button type="submit" variant="ink" size="lg" fullWidth disabled={isPending}>
        {isPending ? 'Создаём…' : 'Создать награду'}
      </Button>
    </form>
  );
}

// ─── Local helpers ────────────────────────────────────────────────────
function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 22 }}>{children}</div>;
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
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 14px',
        background: active ? 'var(--color-ink)' : 'var(--bg-surface)',
        color: active ? 'white' : 'var(--text-primary)',
        border: `1px solid ${active ? 'var(--color-ink)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13.5,
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 14px',
  fontFamily: 'inherit',
  fontSize: 14.5,
  color: 'var(--text-primary)',
};
