import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quiz Game — Multiplayer Trivia',
  description: 'A real-time multiplayer trivia quiz game. 10 questions, 10 seconds each.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
