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
      <style>{`
        :root {
          color-scheme: light;
          background: #f5eadc;
        }

        body {
          margin: 0;
          background: #f5eadc;
        }

        * {
          box-sizing: border-box;
        }

        .auth-shell {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px 16px;
          background:
            linear-gradient(145deg, rgba(255, 252, 247, 0.92), transparent 48%),
            linear-gradient(205deg, rgba(177, 131, 91, 0.18), transparent 56%),
            #f5eadc;
          color: #2c231c;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .auth-card {
          width: min(100%, 390px);
          border: 1px solid rgba(88, 61, 42, 0.16);
          border-radius: 8px;
          padding: 24px;
          background: rgba(255, 250, 244, 0.94);
          box-shadow: 0 20px 55px rgba(68, 43, 26, 0.16);
        }

        .auth-card__brand {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .auth-card__mark {
          display: grid;
          width: 52px;
          height: 52px;
          place-items: center;
          border: 1px solid rgba(81, 56, 39, 0.18);
          border-radius: 8px;
          background:
            linear-gradient(180deg, #fffaf3 0%, #ead0b4 100%);
          color: #54341f;
          font-size: 1.45rem;
          font-weight: 800;
          line-height: 1;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .auth-card__heading {
          margin-bottom: 22px;
          text-align: center;
        }

        .auth-card__eyebrow {
          margin: 0 0 7px;
          color: #7f6046;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .auth-card h1 {
          margin: 0;
          color: #2f251d;
          font-size: clamp(1.85rem, 1.7rem + 0.5vw, 2.15rem);
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1.05;
        }

        @media (min-width: 700px) {
          .auth-shell {
            padding: 32px;
          }

          .auth-card {
            padding: 30px;
          }
        }
      `}</style>
    </main>
  );
}
