'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AuthForm } from '@/components/auth/AuthForm';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/documents');
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <AuthForm mode="signup" />
    </main>
  );
}
