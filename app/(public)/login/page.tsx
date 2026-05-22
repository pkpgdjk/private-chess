import { redirect } from 'next/navigation';

import { AuthCard } from '@/components/web/AuthCard';
import { getCurrentUser } from '@/server/auth/currentUser';

import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  return (
    <AuthCard>
      <LoginForm />
    </AuthCard>
  );
}
