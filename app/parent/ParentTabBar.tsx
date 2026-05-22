'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  pendingCount: number;   // pending approvals → badge on Tasks tab
  pendingOrders: number;  // pending orders → badge on Shop tab
}

function TasksIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function ShopIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V22H4V12" />
      <path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function ParentTabBar({ pendingCount, pendingOrders }: Props) {
  const pathname = usePathname();

  const isTasksActive =
    pathname === '/parent' ||
    pathname.startsWith('/parent/tasks') ||
    pathname.startsWith('/parent/approvals') ||
    pathname.startsWith('/parent/children');

  const isShopActive =
    pathname.startsWith('/parent/shop') ||
    pathname.startsWith('/parent/rewards') ||
    pathname.startsWith('/parent/orders');

  const isProfileActive =
    pathname.startsWith('/parent/profile') ||
    pathname.startsWith('/parent/stats');

  const tabs = [
    {
      href: '/parent',
      label: 'Задания',
      active: isTasksActive,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'var(--color-coral)',
      icon: <TasksIcon active={isTasksActive} />,
    },
    {
      href: '/parent/shop',
      label: 'Магазин',
      active: isShopActive,
      badge: pendingOrders > 0 ? pendingOrders : null,
      badgeColor: 'var(--color-gold-deep)',
      icon: <ShopIcon active={isShopActive} />,
    },
    {
      href: '/parent/profile',
      label: 'Профиль',
      active: isProfileActive,
      badge: null,
      badgeColor: '',
      icon: <ProfileIcon active={isProfileActive} />,
    },
  ];

  return (
    <nav
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0,
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
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            {tab.icon}
            {tab.badge !== null && (
              <span
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -8,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 100,
                  background: tab.badgeColor,
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--bg-surface)',
                  padding: '0 4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.badge}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: tab.active ? 700 : 500,
              letterSpacing: tab.active ? '-0.01em' : '0',
            }}
          >
            {tab.label}
          </span>
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
