'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

type LoginResponse = {
  user?: {
    id: string;
    username: string;
  };
  error?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json()) as LoginResponse;

      if (response.ok && body.user) {
        router.replace('/');
        router.refresh();
        return;
      }

      setError(
        response.status === 400
          ? 'Enter your username and password.'
          : 'Username or password is incorrect.',
      );
    } catch {
      setError('Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label className="login-form__field">
        <span>Username</span>
        <input
          autoComplete="username"
          autoCapitalize="none"
          inputMode="text"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          required
          type="text"
          value={username}
        />
      </label>
      <label className="login-form__field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error ? (
        <p className="login-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="login-form__submit" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
      <style>{`
        .login-form {
          display: grid;
          gap: 16px;
        }

        .login-form__field {
          display: grid;
          gap: 7px;
          color: #4e3b2d;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .login-form__field input {
          width: 100%;
          min-height: 50px;
          border: 1px solid rgba(82, 58, 41, 0.2);
          border-radius: 8px;
          padding: 13px 14px;
          background: #fffdf9;
          color: #2c231c;
          font: inherit;
          font-weight: 600;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease,
            background 150ms ease;
        }

        .login-form__field input:focus {
          border-color: #93683f;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(147, 104, 63, 0.16);
        }

        .login-form__error {
          min-height: 24px;
          margin: -2px 0 0;
          border: 1px solid rgba(139, 55, 45, 0.18);
          border-radius: 8px;
          padding: 10px 12px;
          background: #fff1ec;
          color: #81382d;
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .login-form__submit {
          min-height: 52px;
          border: 0;
          border-radius: 8px;
          padding: 0 18px;
          background: #4b3524;
          color: #fff9f2;
          font: inherit;
          font-size: 1rem;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(75, 53, 36, 0.2);
          transition:
            transform 150ms ease,
            background 150ms ease,
            box-shadow 150ms ease;
          touch-action: manipulation;
        }

        .login-form__submit:focus-visible {
          outline: 4px solid rgba(147, 104, 63, 0.2);
          outline-offset: 3px;
        }

        .login-form__submit:hover:not(:disabled) {
          background: #392719;
          transform: translateY(-1px);
          box-shadow: 0 15px 28px rgba(75, 53, 36, 0.24);
        }

        .login-form__submit:disabled {
          cursor: wait;
          opacity: 0.72;
        }
      `}</style>
    </form>
  );
}
