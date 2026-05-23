import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './AppCard.module.css';

type Accent = 'blue' | 'green' | 'peach' | 'rose';

type AppCardProps = {
  children?: ReactNode;
  className?: string;
};

type ActionCardProps = {
  accent?: Accent;
  body: string;
  href: string;
  icon: string;
  meta: string;
  title: string;
};

const accentClass: Record<Accent, string> = {
  blue: styles.accentBlue,
  green: styles.accentGreen,
  peach: styles.accentPeach,
  rose: styles.accentRose,
};

function classNames(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(' ');
}

export function AppCard({ children, className }: AppCardProps) {
  return <div className={classNames(styles.card, className)}>{children}</div>;
}

export function ActionCard({
  accent = 'peach',
  body,
  href,
  icon,
  meta,
  title,
}: ActionCardProps) {
  return (
    <Link
      className={classNames(styles.card, styles.interactive, accentClass[accent])}
      href={{ pathname: href }}
    >
      <div className={styles.topLine}>
        <p className={styles.meta}>{meta}</p>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
      </div>
      <span className={styles.footer}>Open</span>
    </Link>
  );
}
