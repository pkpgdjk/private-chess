import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/server/auth/currentUser';

import { PlayClient } from './PlayClient';

type PlayPageProps = {
  searchParams: Promise<{
    new?: string | string[];
  }>;
};

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedSearchParams = await searchParams;
  const newParam = resolvedSearchParams.new;
  const newGameRequested = Array.isArray(newParam)
    ? newParam.includes('1')
    : newParam === '1';

  return <PlayClient newGameRequested={newGameRequested} username={user.username} />;
}
