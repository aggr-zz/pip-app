import type { Metadata, Viewport } from 'next';
import './../styles/globals.css';
import { PageTransition } from '@/components/ui/PageTransition';
import { ServiceWorkerRegistration } from '@/components/ui/ServiceWorkerRegistration';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
