import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Fluid — Collaborative Docs',
  description: 'A real-time collaborative document editor with a liquid-glass interface.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Floating, blurred orbs that drift behind the glass for depth. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-20 top-10 h-72 w-72 animate-float rounded-full bg-indigo-300/40 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-80 w-80 animate-float rounded-full bg-pink-300/40 blur-3xl [animation-delay:2s]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-float rounded-full bg-sky-300/40 blur-3xl [animation-delay:4s]" />
        </div>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
