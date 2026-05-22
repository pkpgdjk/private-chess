import { ActionCard, AppCard } from '@/components/web/cards/AppCard';

import styles from './page.module.css';

const quickActions = [
  {
    accent: 'peach',
    body: 'Start a fresh board, pick your side, and let the coach watch the key moments.',
    href: '/play',
    icon: 'P',
    meta: 'Board',
    title: 'Play a game',
  },
  {
    accent: 'rose',
    body: 'Review saved games and scan the moments that decided the result.',
    href: '/history',
    icon: 'H',
    meta: 'Games',
    title: 'Open history',
  },
  {
    accent: 'green',
    body: 'Practice common opening shapes and small tactical decisions.',
    href: '/tactics',
    icon: 'T',
    meta: 'Training',
    title: 'Train tactics',
  },
  {
    accent: 'blue',
    body: 'Tune board feel, coach behavior, bot strength, and saved-game preferences.',
    href: '/settings',
    icon: 'S',
    meta: 'Profile',
    title: 'Settings',
  },
] as const;

const stats = [
  { label: 'Starter lanes', value: '4' },
  { label: 'Opening families', value: '14' },
  { label: 'Review mode', value: 'Static' },
] as const;

const practiceNotes = [
  {
    body: 'Play a calm development game and watch for the first loose piece.',
    tag: '10 min',
    title: 'Warm board',
  },
  {
    body: 'Use the tactics lane when you want quick patterns without starting a full game.',
    tag: 'Fast',
    title: 'Pattern snack',
  },
] as const;

export default function Page() {
  return (
    <section className={styles.dashboard} aria-labelledby="home-title">
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <p className="eyebrow">Private Chess</p>
            <h1 id="home-title">Your chess desk</h1>
          </div>
          <span className={styles.statusPill}>Ready to train</span>
        </div>
        <p className={styles.summary}>
          Jump straight into a game, review your archive, or run a compact practice lane.
        </p>
      </header>

      <div className={styles.quickGrid} aria-label="Quick actions">
        {quickActions.map((action) => (
          <ActionCard
            accent={action.accent}
            body={action.body}
            href={action.href}
            icon={action.icon}
            key={action.href}
            meta={action.meta}
            title={action.title}
          />
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <h2>Snapshot</h2>
        <span>Fallback content</span>
      </div>
      <div className={styles.statGrid} aria-label="App snapshot">
        {stats.map((stat) => (
          <AppCard className={styles.statCard} key={stat.label}>
            <strong className={styles.statValue}>{stat.value}</strong>
            <p className={styles.statLabel}>{stat.label}</p>
          </AppCard>
        ))}
      </div>

      <div className={styles.practiceGrid} aria-label="Practice ideas">
        <div className={styles.sectionHeader}>
          <h2>Next up</h2>
          <span>Small drills</span>
        </div>
        {practiceNotes.map((note) => (
          <AppCard className={styles.lessonCard} key={note.title}>
            <div className={styles.lessonTop}>
              <h3 className={styles.lessonName}>{note.title}</h3>
              <span className={styles.lessonTag}>{note.tag}</span>
            </div>
            <p className={styles.lessonBody}>{note.body}</p>
          </AppCard>
        ))}
      </div>
    </section>
  );
}
