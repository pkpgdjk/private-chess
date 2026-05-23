import Link from 'next/link';
import Image from 'next/image';

import { LogoutButton } from '@/components/web/LogoutButton';

import { HomeClient } from './HomeClient';
import styles from './page.module.css';

const menuLinks = [
  { href: '/play', label: 'Continue', icon: '↗' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
  { href: '/history', label: 'History', icon: '↺' },
] as const;

export default function Page() {
  return (
    <section className={styles.home} aria-labelledby="home-title">
      <div className={styles.brandRow}>
        <Image
          alt=""
          aria-hidden="true"
          height={760}
          priority
          src="/assets/logo-v3.png"
          width={456}
        />
        <div>
          <strong>Purrmate</strong>
          <span>Chess for everyone</span>
        </div>
        <div className={styles.homeActions}>
          <LogoutButton />
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.copy}>
          <h1 id="home-title">
            <span>Cute</span> moves.
            <br />
            <span>Clever</span> victories.
          </h1>
          <p>A cozy chess experience for thinkers of all levels.</p>
        </div>

        <Image
          alt=""
          aria-hidden="true"
          className={styles.heroPiece}
          height={760}
          priority
          src="/assets/logo-v3.png"
          width={456}
        />

        <div className={styles.startPanel}>
          <HomeClient />
        </div>

        <nav className={styles.menu} aria-label="Home shortcuts">
          {menuLinks.map((item) => (
            <Link className={styles.menuLink} href={item.href} key={item.href}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className={styles.recent} aria-label="Recent games and stats">
        <div className={styles.recentList}>
          <div className={styles.sectionTitle}>
            <p className="eyebrow">Recent Games</p>
            <Link href="/history">View all</Link>
          </div>
          <div className={styles.gameRow}>
            <span>Midnight Meow</span>
            <small>18 moves · Level 10</small>
            <strong>Win</strong>
          </div>
          <div className={styles.gameRow}>
            <span>Cotton Whiskers</span>
            <small>32 moves · Level 15</small>
            <strong data-loss="true">Loss</strong>
          </div>
          <div className={styles.gameRow}>
            <span>Velvet Castle</span>
            <small>24 moves · Level 4</small>
            <strong data-draw="true">Draw</strong>
          </div>
        </div>
        <div className={styles.stats}>
          <div>
            <strong>1250</strong>
            <span>Rating</span>
          </div>
          <div>
            <strong>12</strong>
            <span>Win Streak</span>
          </div>
          <div>
            <strong>78%</strong>
            <span>Win Rate</span>
          </div>
        </div>
      </section>
    </section>
  );
}
