import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Chess, type Move } from 'chess.js';

// ============================================================================
// HYBRID ENGINE — tries real Stockfish (WebView) first, falls back to a
// pure-JS negamax engine if Stockfish can't load (offline, CSP, etc).
//
// API:   useStockfishEngine() → { webView, initEngine, getBestMove,
//                                  evaluatePosition, getTopCandidates }
//
// The caller must render `webView` somewhere in the tree (off-screen is fine).
// ============================================================================

export interface CandidateMove {
  uci: string;
  san: string;
  eval: number; // centipawns, side-to-move POV converted to white POV
}

// ============================================================================
// Pure-JS fallback engine (kept self-contained — same as before)
// ============================================================================

type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,   0,  0,  0,  0,  0,  0,  0,  0,
];
const PST_KNIGHT = [
  -50,-40,-30,-30,-30,-30,-40,-50, -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30, -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30, -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50,
];
const PST_BISHOP = [
  -20,-10,-10,-10,-10,-10,-10,-20, -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10, -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10, -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10, -20,-10,-10,-10,-10,-10,-10,-20,
];
const PST_ROOK = [
   0,  0,  0,  0,  0,  0,  0,  0,   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,   0,  0,  0,  5,  5,  0,  0,  0,
];
const PST_QUEEN = [
  -20,-10,-10, -5, -5,-10,-10,-20, -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,  -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5, -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10, -20,-10,-10, -5, -5,-10,-10,-20,
];
const PST_KING = [
  -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,  20, 30, 10,  0,  0, 10, 30, 20,
];
const PST: Record<PieceSymbol, number[]> = {
  p: PST_PAWN, n: PST_KNIGHT, b: PST_BISHOP, r: PST_ROOK, q: PST_QUEEN, k: PST_KING,
};

function pstScore(piece: PieceSymbol, color: 'w' | 'b', file: number, rank: number): number {
  const idx = color === 'w' ? rank * 8 + file : (7 - rank) * 8 + file;
  return PST[piece][idx];
}

function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -100000 : 100000;
  if (chess.isDraw() || chess.isStalemate()) return 0;
  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const sign = p.color === 'w' ? 1 : -1;
      score += sign * (PIECE_VALUE[p.type as PieceSymbol] + pstScore(p.type as PieceSymbol, p.color, f, r));
    }
  }
  return score;
}

function mvvLva(m: Move): number {
  if (!m.captured) return 0;
  return PIECE_VALUE[m.captured as PieceSymbol] * 10 - PIECE_VALUE[m.piece as PieceSymbol];
}

function negamax(
  chess: Chess, depth: number, alpha: number, beta: number, color: 1 | -1, deadline: number
): number {
  if (Date.now() > deadline) return color * evaluate(chess);
  if (depth === 0) return color * evaluate(chess);
  const moves = (chess.moves({ verbose: true }) as Move[]).sort((a, b) => mvvLva(b) - mvvLva(a));
  if (moves.length === 0) return color * evaluate(chess);
  let best = -Infinity;
  for (const move of moves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, (-color) as 1 | -1, deadline);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function pickDepth(skillLevel: number, movetime: number): number {
  const base = Math.max(1, Math.min(5, Math.ceil(skillLevel / 4)));
  return movetime > 1500 ? base + 1 : base;
}

interface SearchResult {
  bestMove: string;
  eval: number;
  pv: string[];
  candidates: CandidateMove[];
}

/**
 * Async pure-JS search that yields to the JS event loop between top-level
 * move evaluations. This is the "chunked Web Worker" substitute for React
 * Native (which has no real Web Workers). Each yield lets the UI thread
 * paint a frame and process touches.
 *
 * The recursive negamax inside each top-level branch is still synchronous —
 * making it fully cooperative would require deep refactoring and isn't
 * worth the complexity. Yielding between top-level moves gives ~30-50ms
 * windows for the UI, which is plenty for smooth animation.
 */
async function pureJsSearchAsync(
  fen: string,
  movetime: number,
  skillLevel: number,
  candidateCount = 1
): Promise<SearchResult> {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return { bestMove: '', eval: 0, pv: [], candidates: [] };

  if (skillLevel <= 3) {
    const choice = moves[Math.floor(Math.random() * moves.length)];
    chess.move(choice);
    const uci = `${choice.from}${choice.to}${choice.promotion ?? ''}`;
    return { bestMove: uci, eval: evaluate(chess), pv: [uci], candidates: [{ uci, san: choice.san, eval: evaluate(chess) }] };
  }

  const depth = pickDepth(skillLevel, movetime);
  const deadline = Date.now() + Math.max(50, movetime);
  const color: 1 | -1 = chess.turn() === 'w' ? 1 : -1;
  const ordered = [...moves].sort((a, b) => mvvLva(b) - mvvLva(a));
  const scored: Array<{ move: Move; score: number }> = [];

  for (let i = 0; i < ordered.length; i++) {
    const move = ordered[i];
    chess.move(move);
    const score = -negamax(chess, depth - 1, -Infinity, Infinity, (-color) as 1 | -1, deadline);
    chess.undo();
    scored.push({ move, score });
    if (Date.now() > deadline) break;
    // Yield every other top-level move so the UI can paint between branches.
    if (i % 2 === 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const candidates = scored.slice(0, Math.max(1, candidateCount)).map((s) => ({
    uci: `${s.move.from}${s.move.to}${s.move.promotion ?? ''}`,
    san: s.move.san,
    eval: color * s.score,
  }));

  let chosen = scored[0].move;
  let chosenScore = scored[0].score;
  if (skillLevel <= 8 && scored.length > 2 && Math.random() < (9 - skillLevel) * 0.07) {
    const idx = 1 + Math.floor(Math.random() * Math.min(2, scored.length - 1));
    chosen = scored[idx].move;
    chosenScore = scored[idx].score;
  }
  const bestUci = `${chosen.from}${chosen.to}${chosen.promotion ?? ''}`;
  return { bestMove: bestUci, eval: color * chosenScore, pv: [bestUci], candidates };
}

// ============================================================================
// Real Stockfish — loaded in a hidden WebView via CDN.
// ============================================================================

function getStockfishHTML(): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<script>
  // ---- Engine harness ----
  var engine = null;
  var ready = false;
  var pending = [];

  function post(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(String(msg));
    }
  }

  function hookup(e) {
    engine = e;
    engine.onmessage = function (evt) {
      var line = typeof evt === 'string' ? evt : evt.data;
      post(line);
    };
    ready = true;
    while (pending.length) engine.postMessage(pending.shift());
    post('__sf_ready__');
  }

  // Expose a stable function RN can inject-call.
  window.sf_send = function (cmd) {
    if (ready && engine) {
      engine.postMessage(cmd);
    } else {
      pending.push(cmd);
    }
  };

  // ---- Load Stockfish from CDN ----
  // jsdelivr serves stockfish.js@10.0.2 reliably; newer NNUE versions need
  // SharedArrayBuffer + COOP/COEP headers that the WebView doesn't provide.
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';
  script.onload = function () {
    try {
      // Stockfish.js exports a global STOCKFISH() factory.
      if (typeof STOCKFISH === 'function') {
        var result = STOCKFISH();
        // Some builds return a promise.
        if (result && typeof result.then === 'function') {
          result.then(hookup).catch(function (err) {
            post('__sf_error__:' + (err && err.message ? err.message : 'init-failed'));
          });
        } else {
          hookup(result);
        }
      } else {
        post('__sf_error__:STOCKFISH-not-global');
      }
    } catch (err) {
      post('__sf_error__:' + (err.message || 'load-failed'));
    }
  };
  script.onerror = function () {
    post('__sf_error__:cdn-load-failed');
  };
  document.head.appendChild(script);
</script>
</head><body></body></html>`;
}

// ============================================================================
// React hook
// ============================================================================

type Mode = 'init' | 'bestmove' | 'evaluate' | 'candidates';

interface Pending {
  type: Mode;
  resolve: (v: any) => void;
  multiPV: Map<number, { eval: number; pv: string[] }>;
  candidateCount: number;
  candidateFen: string;
}

export function useStockfishEngine() {
  const webViewRef = useRef<WebView>(null);
  const stockfishReadyRef = useRef(false);
  const stockfishFailedRef = useRef(false);
  const pendingRef = useRef<Pending | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const initWaitersRef = useRef<Array<() => void>>([]);
  const [, forceTick] = useState(0); // for re-render if anything wants it

  const runSerial = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    const next = queueRef.current.then(work, work);
    queueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    if (!webViewRef.current) return;
    // JSON.stringify handles quoting safely.
    webViewRef.current.injectJavaScript(`window.sf_send && window.sf_send(${JSON.stringify(cmd)}); true;`);
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const line = event.nativeEvent.data;
    if (!line) return;

    if (line === '__sf_ready__') {
      stockfishReadyRef.current = true;
      // Auto-init UCI handshake
      sendCommand('uci');
      sendCommand('setoption name MultiPV value 3');
      sendCommand('isready');
      return;
    }
    if (line.startsWith('__sf_error__')) {
      stockfishFailedRef.current = true;
      stockfishReadyRef.current = false;
      // Resolve any waiters (they'll fall back to pure-JS automatically).
      initWaitersRef.current.forEach((w) => w());
      initWaitersRef.current = [];
      return;
    }

    // Initial handshake completion
    if (line === 'readyok' && !stockfishReadyRef.current) {
      stockfishReadyRef.current = true;
      initWaitersRef.current.forEach((w) => w());
      initWaitersRef.current = [];
      return;
    }

    // Search responses
    const p = pendingRef.current;
    if (!p) return;

    if (line.startsWith('info')) {
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mpvMatch = line.match(/multipv (\d+)/);
      const pvIdx = line.indexOf(' pv ');
      if (cpMatch && pvIdx !== -1) {
        const mpv = mpvMatch ? parseInt(mpvMatch[1], 10) : 1;
        const cp = parseInt(cpMatch[1], 10);
        const pv = line.slice(pvIdx + 4).trim().split(/\s+/);
        p.multiPV.set(mpv, { eval: cp, pv });
      }
      return;
    }

    if (line.startsWith('bestmove')) {
      const match = line.match(/^bestmove\s+(\S+)/);
      const bestMove = match && match[1] !== '(none)' ? match[1] : '';
      const first = p.multiPV.get(1);
      const evalCp = first?.eval ?? 0;
      const pv = first?.pv ?? (bestMove ? [bestMove] : []);

      const resolved = pendingRef.current;
      pendingRef.current = null;

      if (!resolved) return;
      if (resolved.type === 'bestmove') {
        resolved.resolve({ bestMove, eval: evalCp, mate: null });
      } else if (resolved.type === 'evaluate') {
        resolved.resolve({ eval: evalCp, mate: null, bestLine: pv, candidates: [] });
      } else if (resolved.type === 'candidates') {
        // Translate multi-pv to candidate list, deriving SAN via chess.js.
        const chess = new Chess(resolved.candidateFen);
        const candidates: CandidateMove[] = [];
        for (let i = 1; i <= resolved.candidateCount; i++) {
          const l = resolved.multiPV.get(i);
          if (!l) break;
          const uci = l.pv[0] ?? '';
          if (!uci) continue;
          const probe = new Chess(resolved.candidateFen);
          const moveObj = probe.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.slice(4) || undefined,
          });
          candidates.push({
            uci,
            san: moveObj?.san ?? uci,
            eval: l.eval,
          });
        }
        // Stockfish gives eval from white POV when it's white's turn; flip for black.
        const turn = chess.turn();
        if (turn === 'b') {
          for (const c of candidates) c.eval = -c.eval;
        }
        resolved.resolve(candidates);
      }
      forceTick((t) => t + 1);
    }
  }, [sendCommand]);

  // Wait briefly for Stockfish to become ready; if not, we'll fall back.
  const waitForStockfish = useCallback((timeoutMs: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (stockfishReadyRef.current) return resolve(true);
      if (stockfishFailedRef.current) return resolve(false);
      const timer = setTimeout(() => {
        // Remove ourselves from waiters list
        initWaitersRef.current = initWaitersRef.current.filter((w) => w !== signal);
        resolve(stockfishReadyRef.current);
      }, timeoutMs);
      const signal = () => {
        clearTimeout(timer);
        resolve(stockfishReadyRef.current);
      };
      initWaitersRef.current.push(signal);
    });
  }, []);

  const initEngine = useCallback(async (): Promise<void> => {
    // Give Stockfish 4 seconds to load over CDN before falling back.
    await waitForStockfish(4000);
  }, [waitForStockfish]);

  // ----------------- public API -----------------

  const getBestMove = useCallback(
    (fen: string, movetime: number, skillLevel: number) =>
      runSerial(
        async (): Promise<{ bestMove: string; eval: number; mate: number | null }> => {
          if (stockfishReadyRef.current) {
            return new Promise((resolve) => {
              pendingRef.current = {
                type: 'bestmove',
                resolve,
                multiPV: new Map(),
                candidateCount: 1,
                candidateFen: fen,
              };
              sendCommand(`setoption name Skill Level value ${skillLevel}`);
              sendCommand(`setoption name MultiPV value 1`);
              sendCommand(`position fen ${fen}`);
              sendCommand(`go movetime ${movetime}`);
            });
          }
          // Fallback to pure-JS (chunked async — yields to UI thread)
          const r = await pureJsSearchAsync(fen, movetime, skillLevel);
          return { bestMove: r.bestMove, eval: r.eval, mate: null };
        }
      ),
    [runSerial, sendCommand]
  );

  const evaluatePosition = useCallback(
    (fen: string) =>
      runSerial(
        async (): Promise<{ eval: number; mate: number | null; bestLine: string[]; candidates: CandidateMove[] }> => {
          if (stockfishReadyRef.current) {
            return new Promise((resolve) => {
              pendingRef.current = {
                type: 'evaluate',
                resolve,
                multiPV: new Map(),
                candidateCount: 1,
                candidateFen: fen,
              };
              sendCommand(`setoption name MultiPV value 1`);
              sendCommand(`position fen ${fen}`);
              sendCommand(`go movetime 200`);
            });
          }
          const r = await pureJsSearchAsync(fen, 120, 6);
          return { eval: r.eval, mate: null, bestLine: r.pv, candidates: r.candidates };
        }
      ),
    [runSerial, sendCommand]
  );

  const getTopCandidates = useCallback(
    (fen: string, count = 3) =>
      runSerial(
        async (): Promise<CandidateMove[]> => {
          if (stockfishReadyRef.current) {
            return new Promise((resolve) => {
              pendingRef.current = {
                type: 'candidates',
                resolve,
                multiPV: new Map(),
                candidateCount: count,
                candidateFen: fen,
              };
              sendCommand(`setoption name MultiPV value ${count}`);
              sendCommand(`position fen ${fen}`);
              sendCommand(`go movetime 400`);
            });
          }
          const r = await pureJsSearchAsync(fen, 250, 10, count);
          return r.candidates;
        }
      ),
    [runSerial, sendCommand]
  );

  // Render WebView (hidden, off-screen)
  const webView = (
    <WebView
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html: getStockfishHTML() }}
      onMessage={onMessage}
      style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}
      javaScriptEnabled
      domStorageEnabled
      // Silence noisy logs in dev
      onError={() => {
        stockfishFailedRef.current = true;
      }}
    />
  );

  // Re-trigger init handshake if WebView remounts.
  useEffect(() => {
    return () => {
      pendingRef.current = null;
      initWaitersRef.current = [];
    };
  }, []);

  return { webView, initEngine, getBestMove, evaluatePosition, getTopCandidates };
}
