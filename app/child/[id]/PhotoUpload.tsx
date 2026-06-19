'use client';

import { useState, useRef, useTransition } from 'react';
import { uploadTaskPhoto } from './photoActions';
import { Button } from '@/components/ui/Button';

interface PhotoUploadProps {
  /** id ребёнка — нужен для серверной авторизации загрузки */
  childId: string;
  /** family_id ребёнка (оставлен для совместимости; путь задаётся на сервере) */
  familyId?: string;
  /** Колбэк: возвращает photo_path в Storage после успешной загрузки */
  onUploaded: (photoPath: string) => void;
  /** Закрыть без загрузки */
  onCancel: () => void;
}

/**
 * Модалка фото-загрузки.
 *
 * Flow:
 *  1. Ребёнок выбирает камеру или галерею
 *  2. <input> открывает соответствующий пикер
 *  3. Файл показывается превью + есть кнопка «Заменить»
 *  4. Кнопка «Готово» загружает в Supabase Storage
 *  5. onUploaded(path) с возвращённым путём
 *
 * Bucket: task-photos (приватный)
 * Path:   {family_id}/{uuid}.{ext}
 */
export function PhotoUpload({ childId, onUploaded, onCancel }: PhotoUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Валидация размера (5 МБ)
    if (selected.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой — максимум 5 МБ');
      e.target.value = '';
      return;
    }

    // Валидация типа
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Поддерживаются только JPEG, PNG, WebP');
      e.target.value = '';
      return;
    }

    setError(null);
    setFile(selected);

    // Создаём превью
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selected);
  }

  function handleUpload() {
    if (!file) return;

    startUpload(async () => {
      setError(null);

      // Загрузка идёт серверным action на admin-клиенте: у ребёнка по PIN нет
      // Supabase-сессии, и прямая anon-загрузка в приватный бакет падала.
      const formData = new FormData();
      formData.append('childId', childId);
      formData.append('file', file);

      const result = await uploadTaskPhoto(formData);

      if (!result.ok) {
        console.error('[PhotoUpload]', result.error);
        setError(result.error || 'Не получилось загрузить фото. Попробуй ещё раз.');
        return;
      }

      onUploaded(result.path);
    });
  }

  function handleReplace() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(27, 34, 56, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'pip-fade-in 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-surface)',
          borderTopLeftRadius: 'var(--radius-2xl)',
          borderTopRightRadius: 'var(--radius-2xl)',
          padding: '20px 20px 32px',
          animation: 'pip-slide-up 0.25s ease-out',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            background: 'var(--border-default)',
            borderRadius: 100,
            margin: '0 auto 16px',
          }}
        />

        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 20,
            letterSpacing: '-0.015em',
            margin: '0 0 6px',
          }}
        >
          Сделай фото
        </h3>
        <p style={{ fontSize: 13.5, color: 'var(--text-soft)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Покажи родителю, что задача сделана. Фото удалится после подтверждения.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--status-danger-soft)',
              color: 'var(--status-danger)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13.5,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {!preview ? (
          // ─── No photo yet — show capture buttons ───
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <Button
              variant="ink"
              size="lg"
              fullWidth
              onClick={() => cameraInputRef.current?.click()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              Снять на камеру
            </Button>

            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => galleryInputRef.current?.click()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              Выбрать из галереи
            </Button>

            <Button variant="ghost" size="md" fullWidth onClick={onCancel} style={{ marginTop: 4 }}>
              Отмена
            </Button>
          </div>
        ) : (
          // ─── Preview + upload ───
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Превью"
              style={{
                width: '100%',
                maxHeight: 360,
                objectFit: 'cover',
                borderRadius: 'var(--radius-xl)',
                marginBottom: 14,
                border: '1px solid var(--border-soft)',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={handleReplace}
                disabled={isUploading}
              >
                Заменить
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Загружаем…' : 'Готово'}
              </Button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pip-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pip-slide-up {
          from { transform: translateY(20px); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
