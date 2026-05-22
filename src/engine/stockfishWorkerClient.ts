export type StockfishLineListener = (line: string) => void;

export type StockfishWorkerClientOptions = {
  workerUrl?: string;
};

const DEFAULT_WORKER_URL = '/workers/stockfish-loader.js';
const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function normalizeBestMove(line: string): string | null {
  const parts = line.trim().split(/\s+/);

  if (parts[0] !== 'bestmove') {
    return null;
  }

  const move = parts[1];
  if (!move || !UCI_MOVE_PATTERN.test(move)) {
    return null;
  }

  return move;
}

export class StockfishWorkerClient {
  private readonly listeners = new Set<StockfishLineListener>();
  private readonly workerUrl: string;
  private worker: Worker | null = null;

  constructor(options: StockfishWorkerClientOptions = {}) {
    this.workerUrl = options.workerUrl ?? DEFAULT_WORKER_URL;
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined';
  }

  start(): boolean {
    if (this.worker) {
      return true;
    }

    if (!StockfishWorkerClient.isSupported()) {
      return false;
    }

    this.worker = new Worker(this.workerUrl);
    this.worker.addEventListener('message', this.handleWorkerMessage);
    return true;
  }

  send(command: string): boolean {
    if (!this.worker && !this.start()) {
      return false;
    }

    this.worker?.postMessage({ type: 'command', command });
    return true;
  }

  subscribe(listener: StockfishLineListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  stop(): void {
    if (!this.worker) {
      return;
    }

    this.worker.removeEventListener('message', this.handleWorkerMessage);
    this.worker.terminate();
    this.worker = null;
  }

  private readonly handleWorkerMessage = (event: MessageEvent<unknown>) => {
    if (typeof event.data !== 'string') {
      return;
    }

    for (const listener of this.listeners) {
      listener(event.data);
    }
  };
}
