import type { ReactNode } from 'react';

type AuthCardProps = {
  children: ReactNode;
};

export function AuthCard({ children }: AuthCardProps) {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card__brand" aria-hidden="true">
          <span className="auth-card__mark">K</span>
        </div>
        <div className="auth-card__heading">
          <p className="auth-card__eyebrow">Private Chess</p>
          <h1 id="login-title">Sign in</h1>
        </div>
        {children}
      </section>
    </main>
  );
}
