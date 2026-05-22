import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeBestMove, StockfishWorkerClient } from '@/engine/stockfishWorkerClient';

class FakeWorker {
  readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  postMessage = vi.fn();
  terminate = vi.fn();

  dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('normalizeBestMove', () => {
  it('returns the UCI move from a bestmove line', () => {
    expect(normalizeBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(normalizeBestMove('bestmove e7e8q')).toBe('e7e8q');
  });

  it('returns null for non-bestmove engine output', () => {
    expect(normalizeBestMove('info depth 12 score cp 34 pv e2e4 e7e5')).toBeNull();
  });

  it('returns null for weird bestmove lines instead of throwing', () => {
    expect(normalizeBestMove('')).toBeNull();
    expect(normalizeBestMove('bestmove')).toBeNull();
    expect(normalizeBestMove('bestmove (none)')).toBeNull();
    expect(normalizeBestMove('bestmove @@@@')).toBeNull();
  });
});

describe('StockfishWorkerClient', () => {
  it('returns false and notifies subscribers when worker construction fails', () => {
    const lines: string[] = [];
    class ThrowingWorker {
      constructor() {
        throw new Error('CSP blocked worker');
      }
    }

    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', ThrowingWorker);

    const client = new StockfishWorkerClient();
    client.subscribe((line) => lines.push(line));

    expect(client.start()).toBe(false);
    expect(client.send('uci')).toBe(false);
    expect(lines).toEqual([
      'error engine unavailable: CSP blocked worker',
      'error engine unavailable: CSP blocked worker',
    ]);
  });

  it('forwards worker error events to subscribers', () => {
    let worker: FakeWorker | null = null;
    class TestWorker extends FakeWorker {
      constructor() {
        super();
        worker = this;
      }
    }

    vi.stubGlobal('window', {});
    vi.stubGlobal('Worker', TestWorker);

    const dispatchWorkerError = (type: 'error' | 'messageerror') => {
      const lines: string[] = [];
      const client = new StockfishWorkerClient();
      client.subscribe((line) => lines.push(line));

      expect(client.start()).toBe(true);
      const event = new Event(type);
      if (type === 'error') {
        Object.defineProperty(event, 'message', { value: 'worker crashed' });
      }
      worker?.dispatch(type, event);

      return lines;
    };

    expect(dispatchWorkerError('error')).toEqual(['error engine unavailable: worker crashed']);
    expect(dispatchWorkerError('messageerror')).toEqual(['error engine unavailable: messageerror']);
  });
});
