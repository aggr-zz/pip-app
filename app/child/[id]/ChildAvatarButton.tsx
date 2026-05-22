'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarPicker, type AvatarColor, type AvatarData } from '@/components/ui/AvatarPicker';

interface ChildAvatarButtonProps {
  profileId: string;
  familyId: string;
  name: string;
  avatarColor: AvatarColor;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Аватар ребёнка — нажимаешь → открывается пикер для смены.
 * Используется на главной странице ребёнка.
 */
export function ChildAvatarButton({
  profileId,
  familyId,
  name,
  avatarColor,
  avatarEmoji,
  avatarUrl,
  size = 'md',
}: ChildAvatarButtonProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<AvatarData>({ avatarColor, avatarEmoji, avatarUrl });

  return (
    <>
      {/* Аватар с мини-иконкой "✏️" */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
        }}
        aria-label="Изменить аватар"
      >
        <Avatar
          name={name}
          color={current.avatarColor}
          avatarEmoji={current.avatarEmoji}
          avatarUrl={current.avatarUrl}
          size={size}
        />
        {/* Значок карандаша */}
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--border-default)',
            fontSize: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✏️
        </span>
      </button>

      {open && (
        <AvatarPicker
          profileId={profileId}
          familyId={familyId}
          name={name}
          current={current}
          onClose={() => setOpen(false)}
          onUpdated={(data) => setCurrent(data)}
        />
      )}
    </>
  );
}
