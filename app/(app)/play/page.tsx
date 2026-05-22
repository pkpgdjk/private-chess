import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/auth/currentUser';

import { PlayClient } from './PlayClient';

export default async function PlayPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return <PlayClient username={user.username} />;
}
