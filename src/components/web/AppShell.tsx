'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isPlayScreen = pathname === '/play';
  const isHomeScreen = pathname === '/';
  const hideAppChrome = isHomeScreen || isPlayScreen;

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className="app-shell"
      data-home-screen={isHomeScreen}
      data-menu-open={menuOpen}
      data-play-screen={isPlayScreen}
    >
      {!hideAppChrome ? (
        <>
          <header className="app-mobile-bar">
            <button
              aria-controls="app-sidebar"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className="app-menu-button"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <div className="app-brand app-brand--mobile">
              <Image
                alt=""
                aria-hidden="true"
                className="app-brand__mark"
                height={760}
                priority
                src="/assets/logo-v3.png"
                width={456}
              />
              <div className="app-brand__copy">
                <strong className="app-brand__title">Purrmate</strong>
                <span className="app-brand__tagline">Chess for everyone</span>
              </div>
            </div>
            <div className="app-user app-user--mobile" title={user.username}>
              <span className="app-user__name">{user.username}</span>
            </div>
          </header>

          <button
            aria-label="Close menu"
            className="app-sidebar__overlay"
            onClick={closeMenu}
            type="button"
          />

          <aside className="app-sidebar" id="app-sidebar">
            <div className="app-sidebar__top">
              <div className="app-brand">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="app-brand__mark"
                  height={760}
                  priority
                  src="/assets/logo-v3.png"
                  width={456}
                />
                <div className="app-brand__copy">
                  <strong className="app-brand__title">Purrmate</strong>
                  <span className="app-brand__tagline">Chess for everyone</span>
                </div>
              </div>
              <div className="app-user" title={user.username}>
                <span className="app-user__name">{user.username}</span>
              </div>
            </div>
            <nav className="app-nav" aria-label="Primary">
              {navItems.map((item) => (
                <Link
                  className="app-nav__link"
                  href={item.href}
                  key={item.href}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <LogoutButton />
          </aside>
        </>
      ) : null}
      <main className="app-main">
        {children}
        {isPlayScreen ? (
          <div className="play-screen-exit">
            <Link aria-label="Back to home" href="/">
              ←
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
