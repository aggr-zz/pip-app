import type { Metadata, Viewport } from 'next';
import './../styles/globals.css';
import { PageTransition } from '@/components/ui/PageTransition';
import { ServiceWorkerRegistration } from '@/components/ui/ServiceWorkerRegistration';
import { Splash } from '@/components/ui/Splash';

export const metadata: Metadata = {
  title: 'PIP — копилка хороших привычек',
  description: 'Дети делают полезное, получают PIP-монеты, обменивают на согласованные награды. Семейная мотивация без денег и угроз.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PIP',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon-32.png',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2EDE2' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1320' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Self-hosted fonts (no external Google Fonts dependency — works in RU without VPN) */}
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>
        <Splash />
        <ServiceWorkerRegistration />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
