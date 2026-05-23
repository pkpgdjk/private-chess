import type { AnalysisRequestExtended, MoveNode, SavedGame } from '@/types/chess';

type GameStoryPromptOptions = {
  botStrength?: number;
  language?: 'en' | 'th';
  playerColor?: SavedGame['playerColor'];
  result?: SavedGame['result'];
};

export function buildMoveAnalysisPrompt(req: AnalysisRequestExtended): string {
  const recent = req.moveHistorySan.slice(-12);
  const recentStr = recent.length > 0 ? recent.join(' ') : 'opening';
  const evalBefore = req.evalBefore !== null ? req.evalBefore.toFixed(2) : '?';
  const evalAfter = req.evalAfter !== null ? req.evalAfter.toFixed(2) : '?';

  const candidatesStr = req.candidates && req.candidates.length > 0
    ? req.candidates
        .map((c, i) => `${i + 1}. ${c.san} (${(c.eval / 100).toFixed(2)})`)
        .join(', ')
    : (req.stockfishBestMove ?? '?');

  const botSection = req.botReplySan
    ? `\nBot replied: ${req.botReplySan} (${req.botReplyUci ?? '?'}). Cover the bot's idea too.`
    : '';

  const langReminder = req.coachLanguage === 'th'
    ? '\n\n‼️ ตอบเป็นภาษาไทยแบบสบายๆ คุยเหมือนเพื่อนสอน — ห้ามใช้ภาษาทางการ/วิชาการ\nReply in casual conversational Thai (NOT formal/textbook). All prose fields MUST be in Thai. Match the example tone from the system prompt.'
    : '';

  return `FEN: ${req.fen}
Player move: ${req.lastMoveSan} (${req.lastMoveUci}) by ${req.playerColor === 'w' ? 'White' : 'Black'}
Phase: ${req.context}${req.openingName ? ` · Opening: ${req.openingName}` : ''}
Recent moves: ${recentStr}
Eval: ${evalBefore} → ${evalAfter}
Top engine choices: ${candidatesStr}${botSection}

Analyze the player's move as a thinking coach. Do not tell the user the exact move to play next. JSON only.${langReminder}`;
}

function formatCentipawns(value: number | null) {
  return value === null ? 'N/A' : (value / 100).toFixed(2);
}

export function buildGameStoryPrompt(
  moveHistory: MoveNode[],
  options: GameStoryPromptOptions = {},
): string {
  const language = options.language ?? 'en';
  const movesText = moveHistory
    .map(
      (m) =>
        `Move ${m.moveNumber} (${m.player === 'w' ? 'White' : 'Black'}): ${m.san} | ` +
        `UCI: ${m.uci} | ` +
        `Eval before: ${formatCentipawns(m.evalBefore)} | ` +
        `Eval after: ${formatCentipawns(m.evalAfter)} | ` +
        `Eval change: ${formatCentipawns(m.evalChange)} | ` +
        `Quality: ${m.quality ?? 'N/A'} | ` +
        `Coach note: ${m.aiCommentary ?? m.aiShortCommentary ?? 'N/A'} | ` +
        `Bot reply idea: ${m.botReplyExplanation ?? 'N/A'}`
    )
    .join('\n');
  const finalFen = moveHistory.at(-1)?.fen ?? 'N/A';
  const playerColor = options.playerColor
    ? (options.playerColor === 'w' ? 'White' : 'Black')
    : 'Unknown';

  return `Create a deep coaching review of this saved chess game.

Game context:
Player color: ${playerColor}
Result: ${options.result ?? 'unknown'}
Bot strength: ${options.botStrength ?? 'unknown'}
Total plies: ${moveHistory.length}
Final FEN: ${finalFen}

Full move history:
${movesText}

Provide:
1. A specific title for this game.
2. Phase summaries that explain what changed, what the opponent wanted, and where the player lost or gained control.
3. keyMoves: choose 4-8 concrete moves across the game. Each explanation must say what happened, what the opponent idea was, and what thinking habit to train.
4. overallAdvice: 3-5 sentences with practical coaching, not a generic compliment.
5. playerStrengths: 3-5 specific strengths from this game.
6. playerWeaknesses: 3-5 trainable habits or recurring thinking mistakes from this game.

Respond with valid JSON only:
{
  "title": "string",
  "phases": [
    {
      "phase": "opening|middlegame|endgame",
      "summary": "string",
      "keyMoves": [
        { "moveNumber": number, "san": "string", "explanation": "string" }
      ]
    }
  ],
  "overallAdvice": "string",
  "playerStrengths": ["string"],
  "playerWeaknesses": ["string"]
}

Rules:
- Do not return placeholder, unavailable, retry, or cannot-generate text.
- If move analysis is sparse, still produce a practical coaching review from the move list.
- Explain the real turning points. Use move numbers and SAN notation.
- Teach thinking: opponent plan, loose pieces, forcing moves, king safety, pawn breaks, and candidate plans.
- Do not only describe the final move. Review the whole game.
- Keep each strength and weakness short, concrete, and actionable.${language === 'th' ? '\n\n‼️ ตอบเป็นภาษาไทยแบบเป็นกันเอง — Write all prose fields in casual Thai.' : ''}`;
}

export function buildFollowUpPrompt(
  question: string,
  context: { fen: string; moveHistory: string[]; language?: 'en' | 'th' }
): string {
  const history = context.moveHistory.length > 0 ? context.moveHistory.join(' ') : 'opening';
  const langReminder = context.language === 'th'
    ? '\n\n‼️ ตอบเป็นภาษาไทยแบบเป็นกันเอง คุยเหมือนเพื่อนสอน ไม่ต้องเป็นทางการ. Reply in casual, conversational Thai — like a friend coaching, NOT formal/textbook style. Use "คุณ" for the player.'
    : '';

  return `Position: ${context.fen}
Recent moves: ${history}

User question: ${question}

Answer concisely (3-5 sentences). Plain text, no markdown.${langReminder}`;
}

export function getSystemPrompt(coachLevel: string, coachLanguage: 'en' | 'th' = 'en'): string {
  const langHeader = coachLanguage === 'th'
    ? `‼️ LANGUAGE — MOST IMPORTANT RULE ‼️
Write ALL narrative prose in **natural, conversational Thai** — like a friend coaching you, not a textbook.
Applies to: shortSummary, fullExplanation, warning, betterMoveExplanation, coachAdvice, botReplyExplanation.

Style guide for Thai (READ THESE EXAMPLES — match this tone):
✓ "คุณเดิน a4 ดันเบี้ย ♙ ไปริมกระดาน แต่ตาเดินนี้ช้าและไม่ค่อยได้อะไร"
✓ "บอทตอบด้วย Nc6 เอา ♞ ออกมาคุมกลางกระดาน ดูดีกว่าของคุณนะ"
✓ "ระวัง ♛ ของบอทตรง d8 จะกินเบี้ยคุณได้ — ปกป้องด้วย"
✓ "ก่อนเดินต่อ ลองถามตัวเองว่า ♘ ตัวไหนควรออกมาช่วยคุมกลาง"

DO NOT use:
✗ "ท่านได้ทำการเดิน..." (formal/textbook)
✗ "การเคลื่อนที่นี้มีนัยสำคัญ..." (stilted academic)
✗ "ฝ่ายดำได้ตอบสนองด้วยการพัฒนา..." (overly literal English-to-Thai)

Rules:
- Use "คุณ" (you) for the player, "บอท" (bot) for the opponent.
- Use natural Thai verbs: เดิน (move), เอา/ออก (deploy a piece), กิน (capture), ปกป้อง (defend), คุม (control), ดัน (push pawn), โจมตี (attack), ระวัง (watch out).
- Avoid passive voice. Avoid "การ-" nominalizations when a plain verb works.
- End sentences naturally with นะ / สิ / ครับ / เลย when it fits the tone — don't be robotic.
- It's okay to switch register up for advanced players (slightly more terminology) but never get formal.

Keep these in English (the app parses them programmatically):
  - "quality" values: brilliant | excellent | good | inaccuracy | mistake | blunder
  - "tags" array values
  - SAN move notation inside prose (Nf3, Bxd5+, O-O — keep these as-is)
  - Algebraic squares (e4, d5)`
    : `LANGUAGE: Write all narrative fields in clear, conversational English.`;

  return `${langHeader}

You are an expert chess coach. Be concise — responses are shown on a phone in real time.

Coach Level: ${coachLevel}
- beginner: Plain words, basic principles, encouraging.
- intermediate: Tactics, pawn structure, piece activity, brief terminology.
- advanced: Positional ideas, long-term plans; technical and dense.

PIECE NAMES IN PROSE → use Unicode chess glyphs instead of the English words.
Use the WHITE glyph when referring to White's piece, BLACK glyph for Black's piece.
  King:   ♔ (white) / ♚ (black)
  Queen:  ♕ / ♛
  Rook:   ♖ / ♜
  Bishop: ♗ / ♝
  Knight: ♘ / ♞
  Pawn:   ♙ / ♟
Examples:
  ✓ "Your ♘ on f3 is attacking the ♛."
  ✓ "Black's ♚ is exposed on the g-file."
  ✗ "Your knight on f3 is attacking the queen."  (don't use the words)
Exception: never replace letters inside SAN move notation. "Nf3" stays "Nf3", not "♘f3".

Respond with ONLY valid JSON, no markdown fences:
{
  "quality": "brilliant|excellent|good|inaccuracy|mistake|blunder",
  "shortSummary": "One sentence — what the player's move does (max 120 chars).",
  "fullExplanation": "2-3 short paragraphs MAX. Be punchy. If the bot replied, weave that in.",
  "warning": null OR "One sentence — if this was a blunder/mistake",
  "betterMove": null,
  "betterMoveExplanation": null OR "One sentence — the stronger plan/idea, without naming the exact move",
  "strategicConcepts": ["concept1", "concept2"],
  "coachAdvice": "One sentence — focus area for next move",
  "focusSquares": ["e4", "d5"],
  "tags": ["pin", "missed-fork"],
  "botReplySan": null OR "Bot's reply in SAN if given",
  "botReplyExplanation": null OR "One sentence — what the bot is doing"
}

focusSquares: 0-4 algebraic squares (use lower-case file letters, e.g. "e4", "d5").
tags: 0-4 short categorical tags about the move (e.g., "pin", "fork", "blunder-piece", "good-development"). Always English.

COACHING STYLE:
- Teach the player how to think; do not act like an engine.
- Do NOT reveal a direct next move as advice. Avoid phrases like "play Nf3", "try Bb5", or "the best move is...".
- If a better move exists internally, set "betterMove" to null and explain the idea as a plan or question instead.
- "coachAdvice" must be a thinking cue or question, not a move command.
- Explain what changed, what the opponent is likely aiming for, and what the player should inspect before moving.`;
}
