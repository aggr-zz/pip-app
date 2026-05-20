'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from './Avatar';
import { updateChildAvatar } from '@/app/parent/children/actions';

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
  const [preview, setPreview] = useState<AvatarData>(current);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Выбрать эмодзи
  function pickEmoji(emoji: string) {
    const next: AvatarData = { avatarEmoji: emoji, avatarUrl: null, avatarColor: preview.avatarColor };
    setPreview(next);
    save(next);
  }

  // Выбрать цвет
  function pickColor(color: AvatarColor) {
    const next: AvatarData = { ...preview, avatarColor: color };
    setPreview(next);
    save(next);
  }

  // Загрузить фото
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Файл слишком большой. Максимум 2 МБ.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${familyId}/${profileId}.${ext}`;

      // Загружаем (upsert = перезаписать если уже есть)
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Добавляем timestamp чтобы браузер не кэшировал старую фотку
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const next: AvatarData = { avatarUrl: publicUrl, avatarEmoji: null, avatarColor: preview.avatarColor };
      setPreview(next);
      save(next);
    } catch (err) {
      console.error('[AvatarPicker] upload error', err);
      setUploadError('Не получилось загрузить фото. Попробуй ещё раз.');
    } finally {
      setUploading(false);
    }
  }

  function save(data: AvatarData) {
    startTransition(async () => {
      const result = await updateChildAvatar({
        profileId,
        avatarUrl: data.avatarUrl ?? null,
        avatarEmoji: data.avatarEmoji ?? null,
        avatarColor: data.avatarColor,
      });
      if (result.ok) {
        onUpdated?.(data);
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────── */}
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
          padding: '0 0 env(safe-area-inset-bottom)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border-default)' }} />
        </div>

        <div style={{ padding: '16px 20px 24px' }}>
          {/* Title + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Avatar
              name={name}
              color={preview.avatarColor}
              avatarUrl={preview.avatarUrl}
              avatarEmoji={preview.avatarEmoji}
              size="xl"
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {(['emoji', 'color', 'photo'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: tab === t ? 'var(--color-ink)' : 'var(--bg-surface)',
                  color: tab === t ? 'white' : 'var(--text-soft)',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'emoji' ? '😊 Эмодзи' : t === 'color' ? '🎨 Цвет' : '📷 Фото'}
              </button>
            ))}
          </div>

          {/* ── Tab: Emoji ───────────────────────────────────── */}
          {tab === 'emoji' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
              {EMOJI_AVATARS.map((emoji) => {
                const isActive = preview.avatarEmoji === emoji && !preview.avatarUrl;
                return (
                  <button
                    key={emoji}
                    onClick={() => pickEmoji(emoji)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isActive ? 'var(--color-coral)' : 'transparent'}`,
                      background: isActive ? 'var(--color-coral-soft)' : 'var(--bg-surface)',
                      fontSize: 28,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.12s',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label={emoji}
                    aria-pressed={isActive}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Tab: Color ───────────────────────────────────── */}
          {tab === 'color' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 16px' }}>
                Цвет фона аватара — виден везде, даже если выбрано эмодзи
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {AVATAR_COLORS.map((c) => {
                  const isActive = preview.avatarColor === c;
                  return (
                    <button
                      key={c}
                      onClick={() => pickColor(c)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${isActive ? 'var(--color-coral)' : 'transparent'}`,
                        background: 'var(--bg-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.12s',
                      }}
                    >
                      <Avatar
                        name={name}
                        color={c}
                        avatarEmoji={preview.avatarEmoji}
                        size="md"
                      />
                      <span style={{ fontSize: 11.5, color: 'var(--text-soft)', fontWeight: 500 }}>
                        {COLOR_LABELS[c]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tab: Photo ───────────────────────────────────── */}
          {tab === 'photo' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 20, lineHeight: 1.5 }}>
                Загрузи фото — оно станет аватаром вместо инициала или эмодзи.
                <br />Макс. размер: 2 МБ (JPG / PNG / WebP)
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 'var(--radius-xl)',
                  border: '2px dashed var(--border-default)',
                  background: 'var(--bg-surface)',
                  cursor: uploading ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: 24 }}>{uploading ? '⏳' : '📷'}</span>
                {uploading ? 'Загружаем…' : 'Выбрать фото'}
              </button>

              {uploadError && (
                <p style={{
                  marginTop: 12, fontSize: 13,
                  color: 'var(--color-coral)', lineHeight: 1.4,
                }}>
                  {uploadError}
                </p>
              )}

              {preview.avatarUrl && (
                <button
                  onClick={() => {
                    const next: AvatarData = { avatarUrl: null, avatarEmoji: preview.avatarEmoji, avatarColor: preview.avatarColor };
                    setPreview(next);
                    save(next);
                  }}
                  style={{
                    marginTop: 12, background: 'none', border: 'none',
                    color: 'var(--text-soft)', fontSize: 13, cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Удалить фото
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
