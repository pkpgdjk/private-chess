import './globals.css';

import type { Metadata } from 'next';
import type { Viewport } from 'next';
import type { ReactNode } from 'react';

import { PwaRegistrar } from '@/components/web/PwaRegistrar';

export const metadata: Metadata = {
  title: 'Private Chess',
  description: 'A private chess trainer with AI coaching.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Private Chess',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e1e2e',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
