'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from './Avatar';
import { updateChildAvatar, uploadChildAvatar } from '@/app/parent/children/actions';

// ─── Данные ──────────────────────────────────────────────────────────────────

export const EMOJI_AVATARS = [
  '🦁', '🐯', '🦊', '🐼', '🐨', '🐮', '🐷', '🐸',
  '🦋', '🦄', '🐻', '🐙', '🦝', '🐬', '🦖', '🐧',
  '🦉', '🐰', '🐶', '🐱', '🐻‍❄️', '🦕', '🐳', '🐺',
] as const;

const AVATAR_COLORS = ['coral', 'mint', 'ink', 'gold', 'rose', 'sky'] as const;
export type AvatarColor = typeof AVATAR_COLORS[number];

const COLOR_LABELS: Record<AvatarColor, string> = {
  coral: 'Коралл', mint: 'Мята', ink: 'Тёмный',
  gold: 'Золото', rose: 'Розовый', sky: 'Небо',
};

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface AvatarData {
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  avatarColor: AvatarColor;
}

interface AvatarPickerProps {
  profileId: string;
  familyId: string;
  name: string;
  current: AvatarData;
  onClose: () => void;
  onUpdated?: (data: AvatarData) => void;
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export function AvatarPicker({
  profileId,
  familyId,
  name,
  current,
  onClose,
  onUpdated,
}: AvatarPickerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'emoji' | 'color' | 'photo'>('emoji');

  // Локальный черновик — не сохраняется пока не нажать «Сохранить»
  const [draft, setDraft] = useState<AvatarData>(current);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Загрузка фото ──────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Файл слишком большой. Максимум 2 МБ.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Серверная загрузка (admin-клиент) — работает и для ребёнка по PIN,
      // у которого нет Supabase-сессии для прямой записи в бакет.
      const fd = new FormData();
      fd.append('profileId', profileId);
      fd.append('file', file);
      const result = await uploadChildAvatar(fd);
      if (!result.ok) {
        setUploadError(result.error || 'Не получилось загрузить фото. Попробуй ещё раз.');
        return;
      }
      setUploadedUrl(result.url);
      setDraft((d) => ({ ...d, avatarUrl: result.url, avatarEmoji: null }));
    } catch (err) {
      console.error('[AvatarPicker] upload error', err);
      setUploadError('Не получилось загрузить фото. Попробуй ещё раз.');
    } finally {
      setUploading(false);
    }
  }

  // ── Сохранение ────────────────────────────────────────────────────────────
  function handleSave() {
    setSaveError(null);
    startSave(async () => {
      const result = await updateChildAvatar({
        profileId,
        avatarUrl: draft.avatarUrl ?? null,
        avatarEmoji: draft.avatarEmoji ?? null,
        avatarColor: draft.avatarColor,
      });

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }

      onUpdated?.(draft);
      router.refresh();
      onClose();
    });
  }

  const isDirty =
    draft.avatarEmoji !== current.avatarEmoji ||
    draft.avatarColor !== current.avatarColor ||
    draft.avatarUrl   !== current.avatarUrl;

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 100,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* ── Sheet ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 101,
          background: 'var(--bg-page)',
          borderRadius: '20px 20px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border-default)' }} />
        </div>

        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          {/* Title + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 600,
              fontSize: 18, margin: 0, letterSpacing: '-0.01em',
            }}>
              Аватар
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface)',
                fontSize: 16, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-soft)',
              }}
            >
              ✕
            </button>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Avatar
              name={name}
              color={draft.avatarColor}
              avatarUrl={draft.avatarUrl}
              avatarEmoji={draft.avatarEmoji}
              size="xl"
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {(['emoji', 'color', 'photo'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 'var(--radius-md)', border: 'none',
                  background: tab === t ? 'var(--color-ink)' : 'var(--bg-surface)',
                  color: tab === t ? 'white' : 'var(--text-soft)',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'emoji' ? '😊 Эмодзи' : t === 'color' ? '🎨 Цвет' : '📷 Фото'}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

          {/* ── Tab: Emoji ──────────────────────────────────── */}
          {tab === 'emoji' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, paddingBottom: 8 }}>
              {/* "Нет эмодзи" — показывает инициал */}
              <button
                onClick={() => setDraft((d) => ({ ...d, avatarEmoji: null, avatarUrl: null }))}
                style={{
                  aspectRatio: '1', borderRadius: 'var(--radius-md)',
                  border: `2px solid ${!draft.avatarEmoji && !draft.avatarUrl ? 'var(--color-coral)' : 'transparent'}`,
                  background: !draft.avatarEmoji && !draft.avatarUrl ? 'var(--color-coral-soft)' : 'var(--bg-surface)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  color: 'var(--text-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                АБВ
              </button>
              {EMOJI_AVATARS.map((emoji) => {
                const isActive = draft.avatarEmoji === emoji && !draft.avatarUrl;
                return (
                  <button
                    key={emoji}
                    onClick={() => setDraft((d) => ({ ...d, avatarEmoji: emoji, avatarUrl: null }))}
                    style={{
                      aspectRatio: '1', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isActive ? 'var(--color-coral)' : 'transparent'}`,
                      background: isActive ? 'var(--color-coral-soft)' : 'var(--bg-surface)',
                      fontSize: 26, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.1s',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label={emoji} aria-pressed={isActive}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Tab: Color ──────────────────────────────────── */}
          {tab === 'color' && (
            <div style={{ paddingBottom: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 14px' }}>
                Цвет фона — виден с инициалом или эмодзи
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {AVATAR_COLORS.map((c) => {
                  const isActive = draft.avatarColor === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setDraft((d) => ({ ...d, avatarColor: c }))}
                      style={{
                        padding: '12px 8px', borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${isActive ? 'var(--color-coral)' : 'transparent'}`,
                        background: isActive ? 'var(--color-coral-soft)' : 'var(--bg-surface)',
                        cursor: 'pointer', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', gap: 8,
                        transition: 'all 0.12s',
                      }}
                    >
                      <Avatar name={name} color={c} avatarEmoji={draft.avatarEmoji} size="md" />
                      <span style={{ fontSize: 11.5, color: 'var(--text-soft)', fontWeight: 500 }}>
                        {COLOR_LABELS[c]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tab: Photo ──────────────────────────────────── */}
          {tab === 'photo' && (
            <div style={{ textAlign: 'center', paddingBottom: 8 }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 20, lineHeight: 1.5 }}>
                Загрузи фото — оно станет аватаром.
                <br />Макс. 2 МБ · JPG / PNG / WebP
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {draft.avatarUrl ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.avatarUrl}
                    alt="Превью"
                    style={{
                      width: 120, height: 120, objectFit: 'cover',
                      borderRadius: '50%', marginBottom: 14,
                      border: '3px solid var(--color-coral)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-surface)', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                      }}
                    >
                      Заменить
                    </button>
                    <button
                      onClick={() => setDraft((d) => ({ ...d, avatarUrl: null }))}
                      style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-surface)', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 13, color: 'var(--text-soft)',
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '20px 16px',
                    borderRadius: 'var(--radius-xl)',
                    border: '2px dashed var(--border-default)',
                    background: 'var(--bg-surface)',
                    cursor: uploading ? 'wait' : 'pointer',
                    fontFamily: 'inherit', fontSize: 15,
                    color: 'var(--text-primary)', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  }}
                >
                  <span style={{ fontSize: 28 }}>{uploading ? '⏳' : '📷'}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div>{uploading ? 'Загружаем…' : 'Выбрать фото'}</div>
                    {!uploading && <div style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 400 }}>Или сделать с камеры</div>}
                  </div>
                </button>
              )}

              {uploadError && (
                <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-coral)', lineHeight: 1.4 }}>
                  {uploadError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer: Save button ──────────────────────────── */}
        <div style={{ padding: '16px 20px 24px', flexShrink: 0, borderTop: '1px solid var(--border-soft)' }}>
          {saveError && (
            <p style={{ fontSize: 13, color: 'var(--color-coral)', marginBottom: 10, textAlign: 'center' }}>
              {saveError}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || uploading || !isDirty}
            style={{
              width: '100%', padding: '15px',
              borderRadius: 'var(--radius-lg)', border: 'none',
              background: isDirty && !uploading ? 'var(--color-ink)' : 'var(--border-default)',
              color: 'white', fontFamily: 'inherit',
              fontWeight: 700, fontSize: 16, cursor: isDirty ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Сохраняем…' : isDirty ? 'Сохранить' : 'Нет изменений'}
          </button>
        </div>
      </div>
    </>
  );
}
