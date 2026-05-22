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
    </form>
  );
}
