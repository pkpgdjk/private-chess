import { Chess } from 'chess.js';
import {
  createGame,
  getLegalMoves,
  makeMove,
  getGameState,
  cloneGame,
  getMoveHistory,
  getMoveQuality,
  createMoveNode,
  isPromotionMove,
  getTurn,
} from './src/engine/chessLogic';

import {
  parseEvalFromStockfish,
  evalToDisplayString,
  evalToWinProbability,
  evalBarHeight,
  formatCentipawns,
} from './src/engine/evaluator';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

// --- chessLogic tests ---

// 1. createGame and play e2-e4
const game = createGame();
assert(game instanceof Chess, 'createGame should return Chess instance');

const e2Moves = getLegalMoves(game, 'e2');
assert(e2Moves.some((m) => m.to === 'e4'), 'e2 should have e4 move');

const moveResult = makeMove(game, 'e2', 'e4');
assert(moveResult !== null, 'e2-e4 should be legal');
assert(moveResult!.san === 'e4', 'san should be e4');
assert(moveResult!.newFen === 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'fen after e4');

// 2. getGameState
const state = getGameState(game);
assert(state.turn === 'b', 'turn should be black');
assert(state.isCheckmate === false, 'not checkmate');
assert(state.isDraw === false, 'not draw');
assert(state.isCheck === false, 'not check');
assert(state.isStalemate === false, 'not stalemate');
assert(state.isThreefoldRepetition === false, 'not threefold');
assert(state.isInsufficientMaterial === false, 'not insufficient material');

// 3. cloneGame
const cloned = cloneGame(game);
assert(cloned.fen() === game.fen(), 'clone should have same fen');
cloned.move('e5');
assert(cloned.fen() !== game.fen(), 'clone should be independent');

// 4. getMoveHistory
const history = getMoveHistory(game);
assert(history.length === 1 && history[0] === 'e4', 'history should have e4');

// 5. getMoveQuality
assert(getMoveQuality(0.5, 0.3, 'w') === 'good', 'small swing good');
assert(getMoveQuality(0.5, -3.0, 'w') === 'blunder', 'big drop blunder');
assert(getMoveQuality(0.5, -2.0, 'w') === 'mistake', 'medium drop mistake');
assert(getMoveQuality(0.5, -0.2, 'w') === 'inaccuracy', 'small drop inaccuracy');
assert(getMoveQuality(-0.5, 0.5, 'w') === 'brilliant', 'improved brilliant');
assert(getMoveQuality(-0.5, 0.2, 'w') === 'brilliant', 'improved brilliant');
assert(getMoveQuality(null, 0.5, 'w') === 'good', 'null evalBefore -> good');
assert(getMoveQuality(0.5, null, 'w') === 'good', 'null evalAfter -> good');

// Black perspective
assert(getMoveQuality(-0.5, -0.2, 'b') === 'good', 'black small swing good');
assert(getMoveQuality(-0.5, 3.0, 'b') === 'blunder', 'black big drop blunder');
assert(getMoveQuality(-0.5, 2.0, 'b') === 'mistake', 'black medium drop mistake');
assert(getMoveQuality(-0.5, 0.3, 'b') === 'inaccuracy', 'black small drop inaccuracy');
assert(getMoveQuality(0.5, -0.5, 'b') === 'brilliant', 'black improved brilliant');
assert(getMoveQuality(0.5, -0.2, 'b') === 'brilliant', 'black improved brilliant 2');

// 6. createMoveNode
const freshGame = createGame();
const move = freshGame.move('e4');
const node = createMoveNode(freshGame, move, 1, 0.2, 0.3, 'e2e4');
assert(node.moveNumber === 1, 'moveNumber');
assert(node.san === 'e4', 'san');
assert(node.player === 'w', 'player');
assert(node.quality === 'good', 'quality');
assert(Math.abs(node.evalChange! - 0.1) < 0.0001, 'evalChange');
assert(node.stockfishBestMove === 'e2e4', 'stockfishBestMove');
assert(node.variations.length === 0, 'variations empty');
assert(typeof node.timestamp === 'number', 'timestamp is number');

// 7. isPromotionMove
const promoGame = createGame('8/4P3/8/8/8/8/8/4k2K w - - 0 1');
assert(isPromotionMove(promoGame, 'e7', 'e8') === true, 'white promotion');
assert(isPromotionMove(promoGame, 'e7', 'd8') === false, 'not promotion (diag without capture)');
const blackPromoGame = createGame('4k2K/8/8/8/8/8/4p3/8 b - - 0 1');
assert(isPromotionMove(blackPromoGame, 'e2', 'e1') === true, 'black promotion');
assert(isPromotionMove(blackPromoGame, 'e2', 'e3') === false, 'not promotion');

// 8. getTurn
assert(getTurn(freshGame) === 'b', 'turn should be b after e4');

// --- evaluator tests ---

// parseEvalFromStockfish
const cpResult = parseEvalFromStockfish('info depth 10 score cp 50');
assert(cpResult !== null && cpResult.eval === 0.5 && !cpResult.isMate, 'cp 50');

const mateResult = parseEvalFromStockfish('info depth 15 score mate 3');
assert(mateResult !== null && mateResult.eval === 3 && mateResult.isMate && mateResult.mateIn === 3, 'mate 3');

const negMateResult = parseEvalFromStockfish('info depth 12 score mate -2');
assert(negMateResult !== null && negMateResult.eval === -2 && negMateResult.isMate && negMateResult.mateIn === 2, 'mate -2');

const negCpResult = parseEvalFromStockfish('info depth 12 score cp -120');
assert(negCpResult !== null && negCpResult.eval === -1.2 && !negCpResult.isMate, 'cp -120');

assert(parseEvalFromStockfish('info depth 5') === null, 'no score returns null');

// evalToDisplayString
assert(evalToDisplayString(0.5, false, null) === '+0.5', 'display +0.5');
assert(evalToDisplayString(-1.2, false, null) === '-1.2', 'display -1.2');
assert(evalToDisplayString(3, true, 3) === 'M3', 'display M3');
assert(evalToDisplayString(-2, true, 2) === '-M2', 'display -M2');

// evalToWinProbability
const prob = evalToWinProbability(0);
assert(Math.abs(prob - 50) < 0.01, '0 cp = 50%');
assert(evalToWinProbability(1000) > 90, 'high cp > 90%');
assert(evalToWinProbability(-1000) < 10, 'low cp < 10%');

// evalBarHeight
assert(evalBarHeight(3, true, 3) === 100, 'white mate = 100');
assert(evalBarHeight(-2, true, 2) === 0, 'black mate = 0');
assert(evalBarHeight(0, false, null) > 49 && evalBarHeight(0, false, null) < 51, '0 eval ~50%');

// formatCentipawns
assert(formatCentipawns(50) === '+0.50', 'format +0.50');
assert(formatCentipawns(-120) === '-1.20', 'format -1.20');
assert(formatCentipawns(0) === '0.00', 'format 0.00');

console.log('All tests passed!');
