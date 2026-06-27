'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Already signed in? Skip the form.
  useEffect(() => {
    if (!loading && user) router.replace('/documents');
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <AuthForm mode="signin" />
    </main>
  );
}
