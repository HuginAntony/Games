import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'WisQuiz — Good company. Great questions.',
  description: 'Your trivia party table. Everyone answers at the same time on their own device. Invite up to 12 friends or practise solo.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'WisQuiz', statusBarStyle: 'black-translucent' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
