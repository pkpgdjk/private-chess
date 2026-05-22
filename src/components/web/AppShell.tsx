import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import type { CurrentUser } from '@/server/auth/currentUser';

import { LogoutButton } from './LogoutButton';

type AppShellProps = {
  children: ReactNode;
  user: CurrentUser;
};

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/play', label: 'Play' },
  { href: '/history', label: 'History' },
  { href: '/settings', label: 'Settings' },
] satisfies ReadonlyArray<{ href: Route; label: string }>;

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__top">
          <div className="app-brand">
            <span className="app-brand__mark" aria-hidden="true">
              K
            </span>
            <div className="app-brand__copy">
              <p className="eyebrow">Private Chess</p>
              <strong className="app-brand__title">Trainer</strong>
            </div>
          </div>
          <div className="app-user" title={user.username}>
            <span className="app-user__name">{user.username}</span>
          </div>
        </div>
        <nav className="app-nav" aria-label="Primary">
          {navItems.map((item) => (
            <Link className="app-nav__link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
