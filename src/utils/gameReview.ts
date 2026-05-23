import type { GameStoryResponse, MoveNode, SavedGame, Settings } from '@/types/chess';

type CoachLanguage = Settings['coachLanguage'];
type ReviewPhase = GameStoryResponse['phases'][number]['phase'];

export type CompletedGameReviewInput = {
  history: MoveNode[];
  playerColor: SavedGame['playerColor'];
  result: SavedGame['result'];
  botStrength: number;
};

const ISSUE_QUALITIES = new Set(['blunder', 'mistake', 'inaccuracy']);
const GOOD_QUALITIES = new Set(['brilliant', 'excellent']);

function phaseForMove(moveNumber: number): ReviewPhase {
  if (moveNumber <= 6) return 'opening';
  if (moveNumber <= 25) return 'middlegame';
  return 'endgame';
}

function phaseLabel(phase: ReviewPhase, language: CoachLanguage) {
  if (language === 'th') {
    if (phase === 'opening') return 'เปิดเกม';
    if (phase === 'middlegame') return 'กลางเกม';
    return 'ท้ายเกม';
  }

  return phase;
}

function resultTitle(result: SavedGame['result'], language: CoachLanguage) {
  if (language === 'th') {
    if (result === 'win') return 'รีวิวเกมที่ชนะ';
    if (result === 'loss') return 'รีวิวเกมที่แพ้';
    return 'รีวิวเกมเสมอ';
  }

  if (result === 'win') return 'Win review';
  if (result === 'loss') return 'Loss review';
  return 'Draw review';
}

function moveId(move: MoveNode) {
  return `${move.moveNumber}-${move.player}-${move.san}-${move.uci}`;
}

function isIssueMove(move: MoveNode) {
  return move.quality ? ISSUE_QUALITIES.has(move.quality) : false;
}

function isGoodMove(move: MoveNode) {
  return move.quality ? GOOD_QUALITIES.has(move.quality) : false;
}

function isForcingMove(move: MoveNode) {
  return /[+#x=]/.test(move.san);
}

function selectKeyMoves(playerMoves: MoveNode[], history: MoveNode[]) {
  const selected: MoveNode[] = [];
  const seen = new Set<string>();

  const add = (move: MoveNode | undefined) => {
    if (!move) return;
    const id = moveId(move);
    if (seen.has(id)) return;
    seen.add(id);
    selected.push(move);
  };

  playerMoves.filter(isIssueMove).slice(0, 3).forEach(add);
  playerMoves.filter(isGoodMove).slice(0, 2).forEach(add);
  playerMoves.filter(isForcingMove).slice(-3).forEach(add);
  add(playerMoves.find((move) => move.moveNumber >= 7));
  add(playerMoves.find((move) => move.moveNumber >= 18));
  add(playerMoves.at(-1) ?? history.at(-1));

  return selected
    .sort((a, b) => a.moveNumber - b.moveNumber || a.timestamp - b.timestamp)
    .slice(0, 8);
}

function explainKeyMove(move: MoveNode, language: CoachLanguage) {
  const quality = move.quality && move.quality !== 'good' ? move.quality : null;
  const evalText = typeof move.evalChange === 'number'
    ? ` Eval changed by ${(move.evalChange / 100).toFixed(2)}.`
    : '';

  if (language === 'th') {
    if (isIssueMove(move)) {
      return `จังหวะนี้ถูกจัดเป็น ${quality}. ก่อนเดินให้ถามว่า บอทขู่เช็ก กิน หรือเข้าช่องสำคัญไหนอยู่ แล้วตาเดินนี้หยุดแผนนั้นจริงไหม`;
    }

    if (isForcingMove(move)) {
      return `เป็นตาบังคับที่มีเช็ก กิน หรือโปรโมชัน ให้ย้อนดูว่าคุณบังคับให้บอทตอบแบบจำกัดได้อย่างไร`;
    }

    return 'ใช้ตานี้ฝึกอ่านแผนของบอท: บอทอยากปรับหมากตัวไหน ช่องไหนอ่อน และหมากเราตัวไหนต้องป้องกัน';
  }

  if (isIssueMove(move)) {
    return `This was marked ${quality}. Before this move, name the opponent threat, the loose piece or square, and whether your move actually answers it.${evalText}`;
  }

  if (isForcingMove(move)) {
    return `This forcing move changed the conversation. Review why the check, capture, or promotion limited the opponent's replies.${evalText}`;
  }

  return `Use this position as a thinking drill: identify the opponent plan, your least defended piece, and one quiet improving move.${evalText}`;
}

function phaseSummary(options: {
  phase: ReviewPhase;
  phaseMoves: MoveNode[];
  issueCount: number;
  forcingCount: number;
  botStrength: number;
  language: CoachLanguage;
}) {
  const { phase, phaseMoves, issueCount, forcingCount, botStrength, language } = options;
  const playerMoveText = language === 'th'
    ? `${phaseMoves.length} ตาของคุณ`
    : `${phaseMoves.length} player move${phaseMoves.length === 1 ? '' : 's'}`;

  if (language === 'th') {
    return `${phaseLabel(phase, language)}มี ${playerMoveText}. เจอบอทระดับ ${botStrength}, จุดสำคัญคือแยกว่าเมื่อไรควรป้องกันแรงขู่ และเมื่อไรควรเล่นตาบังคับของตัวเอง; ช่วงนี้มี ${issueCount} จุดเสี่ยงและ ${forcingCount} จังหวะบังคับให้ย้อนดู`;
  }

  return `${phaseLabel(phase, language)} has ${playerMoveText}. Against level ${botStrength}, the main lesson is separating opponent threats from your own forcing chances; this phase has ${issueCount} risk moment${issueCount === 1 ? '' : 's'} and ${forcingCount} forcing move${forcingCount === 1 ? '' : 's'} to review.`;
}

function buildPhases(
  history: MoveNode[],
  playerMoves: MoveNode[],
  keyMoves: MoveNode[],
  botStrength: number,
  language: CoachLanguage,
): GameStoryResponse['phases'] {
  const phases: ReviewPhase[] = ['opening', 'middlegame', 'endgame'];

  return phases
    .map((phase) => {
      const phaseMoves = playerMoves.filter((move) => phaseForMove(move.moveNumber) === phase);
      const phaseKeyMoves = keyMoves.filter((move) => phaseForMove(move.moveNumber) === phase);
      const fallbackMove = phaseMoves.at(-1);

      if (phaseMoves.length === 0 && phaseKeyMoves.length === 0) {
        return null;
      }

      const issueCount = phaseMoves.filter(isIssueMove).length;
      const forcingCount = phaseMoves.filter(isForcingMove).length;
      const movesForPhase = (phaseKeyMoves.length > 0 ? phaseKeyMoves : [fallbackMove])
        .filter((move): move is MoveNode => Boolean(move))
        .slice(0, 3);

      return {
        phase,
        summary: phaseSummary({ phase, phaseMoves, issueCount, forcingCount, botStrength, language }),
        keyMoves: movesForPhase.map((move) => ({
          moveNumber: move.moveNumber,
          san: move.san,
          explanation: explainKeyMove(move, language),
        })),
      };
    })
    .filter((phase): phase is GameStoryResponse['phases'][number] => Boolean(phase));
}

function buildStrengths(options: {
  playerMoves: MoveNode[];
  result: SavedGame['result'];
  language: CoachLanguage;
}) {
  const { playerMoves, result, language } = options;
  const bestMove = playerMoves.find(isGoodMove) ?? playerMoves.filter(isForcingMove).at(-1);
  const completedText = language === 'th'
    ? 'คุณมีเกมเต็มให้ย้อนดู ไม่ใช่แค่ตาสุดท้าย จึงฝึกอ่านแผนได้เป็นระบบ'
    : 'You have a complete game to review, so you can train the whole thinking process instead of only the final move.';
  const resultText = language === 'th'
    ? result === 'win'
      ? 'คุณปิดเกมได้สำเร็จ ตอนนี้ให้หาว่าช่วงไหนที่เริ่มคุมเกมได้'
      : result === 'loss'
        ? 'คุณมีตัวอย่างชัดเจนของจุดที่เกมเริ่มเสีย ใช้เป็นแบบฝึกแก้แรงขู่'
        : 'คุณยื้อเกมจนเสมอได้ ให้ดูว่าจุดไหนช่วยรักษาตำแหน่ง'
    : result === 'win'
      ? 'You converted the game; now identify where your position first became easier to play.'
      : result === 'loss'
        ? 'The game gives clear pressure points where you can practice defending threats earlier.'
        : 'You held the game to a draw; review which defensive decisions kept the position stable.';
  const bestMoveText = language === 'th'
    ? bestMove
      ? `มีจังหวะที่ใช้เป็นตัวอย่างได้ เช่น ${bestMove.moveNumber}. ${bestMove.san} ให้ดูว่าตานี้บังคับหรือพัฒนาตำแหน่งอย่างไร`
      : 'คุณเล่นจนมีข้อมูลพอให้แยกเปิดเกม กลางเกม และท้ายเกม'
    : bestMove
      ? `You produced at least one useful model move, such as ${bestMove.moveNumber}. ${bestMove.san}; study what it forced or improved.`
      : 'You played enough moves to separate opening habits, middlegame plans, and endgame decisions.';

  return [resultText, bestMoveText, completedText];
}

function buildWeaknesses(options: {
  issueMoves: MoveNode[];
  language: CoachLanguage;
}) {
  const { issueMoves, language } = options;
  const firstIssue = issueMoves[0];

  if (language === 'th') {
    return [
      firstIssue
        ? `เริ่มจาก ${firstIssue.moveNumber}. ${firstIssue.san} (${firstIssue.quality}): ก่อนเดินให้พูดให้ได้ว่า บอทขู่อะไร และหมากเราอะไรหลวม`
        : 'แม้ไม่มีตาที่ถูกจัดว่าแย่ ให้ฝึกหยุดก่อนเดินทุกครั้งเพื่อเช็ก เช็ก-กิน-ขู่ ของบอท',
      'หลังบอทเดินทุกตา อย่ารีบหาตาเดินของเรา ให้ถามก่อนว่า ตานั้นโจมตีช่องไหน เปิดเส้นไหน หรือย้ายหมากป้องกันอะไร',
      'เลือก 2-3 ตาสำคัญจากรีวิวนี้ แล้วลองเขียนแผนปลอดภัยหนึ่งแผนก่อนดูคำตอบของโค้ช',
    ];
  }

  return [
    firstIssue
      ? `Start with ${firstIssue.moveNumber}. ${firstIssue.san} (${firstIssue.quality}): before moving, say what the opponent threatened and which of your pieces or squares was loose.`
      : 'Even without a marked mistake, pause before every move and scan opponent checks, captures, and threats.',
    'After each opponent move, do not hunt for your move first; ask what square, line, or defender changed.',
    'Pick 2-3 key moments from this review and write one safe plan before checking the coach explanation.',
  ];
}

export function buildLocalGameReview(
  { history, playerColor, result, botStrength }: CompletedGameReviewInput,
  language: CoachLanguage = 'en',
): GameStoryResponse {
  const playerMoves = history.filter((move) => move.player === playerColor);
  const issueMoves = playerMoves.filter(isIssueMove);
  const keyMoves = selectKeyMoves(playerMoves, history);
  const phases = buildPhases(history, playerMoves, keyMoves, botStrength, language);
  const fallbackPhase: GameStoryResponse['phases'][number] = {
    phase: 'opening',
    summary: language === 'th'
      ? `เกมนี้มี ${history.length} ตาเดินที่บันทึกไว้ ใช้เป็นแบบฝึกอ่านแผนของบอทก่อนเลือกตาเดินของคุณ`
      : `This saved game has ${history.length} recorded move${history.length === 1 ? '' : 's'}, enough to practice reading the opponent plan before choosing your move.`,
    keyMoves: keyMoves.slice(0, 2).map((move) => ({
      moveNumber: move.moveNumber,
      san: move.san,
      explanation: explainKeyMove(move, language),
    })),
  };

  return {
    title: resultTitle(result, language),
    phases: phases.length > 0 ? phases : [fallbackPhase],
    overallAdvice: language === 'th'
      ? 'ก่อนเกมถัดไป เลือกอย่างน้อย 3 ตาจากรีวิวนี้ แล้วพูดเป็นขั้นตอนว่า บอทขู่อะไร หมากเราไหนหลวม เราต้องป้องกันหรือมีตาบังคับที่ดีกว่า และแผนที่ปลอดภัยคืออะไร'
      : 'Before the next game, choose at least 3 moments from this review and say the full thinking chain: what the opponent threatens, what is loose, whether you must defend or have a stronger forcing idea, and what plan is safest.',
    playerStrengths: buildStrengths({ playerMoves, result, language }),
    playerWeaknesses: buildWeaknesses({ issueMoves, language }),
  };
}

export function isUnavailableGameReview(review: GameStoryResponse) {
  const keyMoveCount = review.phases.reduce((count, phase) => count + phase.keyMoves.length, 0);

  return (
    review.title.toLowerCase().includes('unavailable') ||
    review.overallAdvice.toLowerCase().includes('try generating') ||
    review.overallAdvice.trim().length < 50 ||
    keyMoveCount < 2 ||
    review.playerStrengths.length < 2 ||
    review.playerWeaknesses.length < 2
  );
}

export function coerceGameReview(
  review: GameStoryResponse,
  completedGame: CompletedGameReviewInput,
  language: CoachLanguage = 'en',
) {
  return isUnavailableGameReview(review)
    ? buildLocalGameReview(completedGame, language)
    : review;
}
