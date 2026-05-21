'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  childId: string;
  avatarColor: string;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  childName: string;
  availableTaskCount: number;
  achievementsCount: number;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TasksIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V22H4V12" />
      <path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5" />
      <path d="M17 4h3a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5" />
      <path d="M5 9V4h14v5a7 7 0 0 1-14 0z" />
    </svg>
  );
}

// ─── Avatar tab icon ──────────────────────────────────────────────────────────

function AvatarTabIcon({
  color,
  emoji,
  url,
  name,
  active,
}: {
  color: string;
  emoji: string | null;
  url: string | null;
  name: string;
  active: boolean;
}) {
  const COLOR_MAP: Record<string, string> = {
    coral: '#FF6B6B',
    mint: '#48C78E',
    ink: '#363636',
    gold: '#F2C14E',
    rose: '#F2A7C3',
    sky: '#4EB3F2',
  };
  const bg = COLOR_MAP[color] ?? '#FF6B6B';
  const initials = name.charAt(0).toUpperCase();

  const size = 26;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: active ? '2.5px solid var(--color-coral)' : '2px solid var(--border-default)',
        flexShrink: 0,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : emoji ? (
        <div style={{
          width: '100%', height: '100%',
          background: bg + '33',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>
          {emoji}
        </div>
      ) : (
        <div style={{
          width: '100%', height: '100%', background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 700,
        }}>
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChildTabBar({
  childId,
  avatarColor,
  avatarEmoji,
  avatarUrl,
  childName,
  availableTaskCount,
  achievementsCount,
}: Props) {
  const pathname = usePathname();

  const isTasksActive =
    pathname === `/child/${childId}` ||
    pathname.startsWith(`/child/${childId}/task`) ||
    pathname.startsWith(`/child/${childId}/history`);

  const isShopActive = pathname.startsWith(`/child/${childId}/shop`);
  const isAchievementsActive = pathname.startsWith(`/child/${childId}/achievements`);
  const isProfileActive = pathname.startsWith(`/child/${childId}/profile`);

  const tabs = [
    {
      href: `/child/${childId}`,
      label: 'Задания',
      active: isTasksActive,
      badge: availableTaskCount > 0 ? availableTaskCount : null,
      icon: <TasksIcon active={isTasksActive} />,
    },
    {
      href: `/child/${childId}/shop`,
      label: 'Магазин',
      active: isShopActive,
      badge: null,
      icon: <ShopIcon active={isShopActive} />,
    },
    {
      href: `/child/${childId}/achievements`,
      label: 'Ачивки',
      active: isAchievementsActive,
      badge: null,
      icon: <TrophyIcon active={isAchievementsActive} />,
    },
    {
      href: `/child/${childId}/profile`,
      label: 'Профиль',
      active: isProfileActive,
      badge: null,
      icon: (
        <AvatarTabIcon
          color={avatarColor}
          emoji={avatarEmoji}
          url={avatarUrl}
          name={childName}
          active={isProfileActive}
        />
      ),
    },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            padding: '10px 4px 10px',
            textDecoration: 'none',
            color: tab.active ? 'var(--color-coral)' : 'var(--text-muted)',
            position: 'relative',
          }}
        >
          {/* Icon with optional badge */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            {tab.icon}
            {tab.badge !== null && (
              <span
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -7,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 100,
                  background: 'var(--color-coral)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--bg-surface)',
                  padding: '0 2px',
                }}
              >
                {tab.badge}
              </span>
            )}
          </div>

          {/* Label */}
          <span
            style={{
              fontSize: 10,
              fontWeight: tab.active ? 700 : 500,
              letterSpacing: tab.active ? '-0.01em' : '0',
            }}
          >
            {tab.label}
          </span>

          {/* Active indicator dot */}
          {tab.active && (
            <span
              style={{
                position: 'absolute',
                bottom: 6,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--color-coral)',
              }}
            />
          )}
        </Link>
      ))}
    </nav>
  );
}
