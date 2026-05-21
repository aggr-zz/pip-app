import Link from 'next/link';
import { PipLogo } from '@/components/ui/PipLogo';

export const metadata = {
  title: 'PIP — admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          background: 'var(--color-ink)',
          color: 'white',
          padding: '14px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white' }}>
            <div style={{ filter: 'invert(1) brightness(2)' }}>
              <PipLogo size={28} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                background: 'var(--color-coral)',
                color: 'white',
                padding: '3px 9px',
                borderRadius: 100,
              }}
            >
              admin
            </span>
          </Link>

          <Link
            href="/parent"
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 500,
            }}
          >
            ← Вернуться в приложение
          </Link>
        </div>
      </header>

      {/* Sub-nav */}
      <nav
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-soft)',
          position: 'sticky',
          top: 56,
          zIndex: 9,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
          }}
        >
          <NavLink href="/admin">Обзор</NavLink>
          <NavLink href="/admin/families">Семьи</NavLink>
          <NavLink href="/admin/waitlist">Waitlist</NavLink>
          <NavLink href="/admin/stats">Статистика</NavLink>
        </div>
      </nav>

      <main style={{ padding: '32px 24px 64px' }}>{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: '14px 16px',
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--text-soft)',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </Link>
  );
}
