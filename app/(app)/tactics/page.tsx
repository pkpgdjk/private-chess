import { AppCard } from '@/components/web/cards/AppCard';
import { openingMap } from '@/constants/openings';
import { qualityLabel } from '@/constants/quality';

import styles from './page.module.css';

const tacticLanes = [
  {
    body: 'Find checks, captures, and threats before touching the piece.',
    label: qualityLabel.good,
    title: 'Candidate scan',
  },
  {
    body: 'Spot undefended pieces after the opening shape is set.',
    label: qualityLabel.excellent,
    title: 'Loose piece check',
  },
  {
    body: 'Compare your instinct with a calmer developing move.',
    label: qualityLabel.inaccuracy,
    title: 'Tempo choice',
  },
] as const;

const openingPrompts = [
  'Name the pawn break this setup invites.',
  'Choose the piece that should improve first.',
  'Find the square your opponent wants next.',
  'Mark the safest castling plan.',
  'Look for the first tactical contact.',
  'Pick the move that completes development.',
] as const;

const openingCards = Object.entries(openingMap).map(([moves, name], index) => ({
  moves,
  name,
  prompt: openingPrompts[index % openingPrompts.length],
}));

export default function TacticsPage() {
  return (
    <section className={styles.tactics} aria-labelledby="tactics-title">
      <header className={styles.header}>
        <p className="eyebrow">Training</p>
        <h1 id="tactics-title">Tactics lane</h1>
        <p className={styles.summary}>
          Short practice cards for opening recognition and first tactical decisions.
        </p>
      </header>

      <div className={styles.sectionHeader}>
        <h2>Focus lanes</h2>
        <span>Static drills</span>
      </div>
      <div className={styles.laneGrid} aria-label="Tactic focus lanes">
        {tacticLanes.map((lane) => (
          <AppCard className={styles.laneCard} key={lane.title}>
            <div className={styles.cardTop}>
              <h3>{lane.title}</h3>
              <span className={styles.badge}>{lane.label}</span>
            </div>
            <p className={styles.body}>{lane.body}</p>
          </AppCard>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <h2>Opening cards</h2>
        <span>{openingCards.length} patterns</span>
      </div>
      <div className={styles.openingGrid} aria-label="Opening practice cards">
        {openingCards.map((opening) => (
          <AppCard className={styles.openingCard} key={opening.moves}>
            <div className={styles.cardTop}>
              <h3>{opening.name}</h3>
              <span className={styles.badge}>Open</span>
            </div>
            <p className={styles.moves}>{opening.moves}</p>
            <p className={styles.prompt}>{opening.prompt}</p>
          </AppCard>
        ))}
      </div>
    </section>
  );
}
