'use client';

import { useState } from 'react';
import { AvatarPicker, type AvatarColor, type AvatarData } from '@/components/ui/AvatarPicker';

interface EditAvatarButtonProps {
  profileId: string;
  familyId: string;
  name: string;
  avatarColor: AvatarColor;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
}

export function EditAvatarButton({
  profileId,
  familyId,
  name,
  avatarColor,
  avatarEmoji,
  avatarUrl,
}: EditAvatarButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.12)',
          color: 'white',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          marginTop: 8,
        }}
      >
        ✏️ Изменить аватар
      </button>

      {open && (
        <AvatarPicker
          profileId={profileId}
          familyId={familyId}
          name={name}
          current={{ avatarColor, avatarEmoji, avatarUrl }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
