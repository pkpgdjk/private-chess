import type { AnalysisRequestExtended, MoveNode } from '@/types/chess';

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

Analyze the player's move. JSON only.${langReminder}`;
}

export function buildGameStoryPrompt(moveHistory: MoveNode[], language: 'en' | 'th' = 'en'): string {
  const movesText = moveHistory
    .map(
      (m) =>
        `Move ${m.moveNumber} (${m.player === 'w' ? 'White' : 'Black'}): ${m.san} | ` +
        `Eval: ${m.evalAfter !== null ? m.evalAfter.toFixed(2) : 'N/A'} | ` +
        `Quality: ${m.quality ?? 'N/A'} | ` +
        `Commentary: ${m.aiCommentary ?? 'N/A'}`
    )
    .join('\n');

  return `Create a structured narrative of the following chess game.

Move History with Evaluations and Commentaries:
${movesText}

Provide:
1. A catchy title.
2. Breakdown by phase (opening, middlegame, endgame) with summaries and key moves.
3. Overall advice.
4. Player strengths.
5. Player weaknesses.

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
}${language === 'th' ? '\n\n‼️ ตอบเป็นภาษาไทยแบบเป็นกันเอง — Write all prose fields in casual Thai.' : ''}`;
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
✓ "ลองเดิน Nf3 แทนสิ เอา ♘ ออกมาช่วยคุมกลาง"

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
  "betterMove": null OR "SAN of a better move",
  "betterMoveExplanation": null OR "One sentence — why it's stronger",
  "strategicConcepts": ["concept1", "concept2"],
  "coachAdvice": "One sentence — focus area for next move",
  "focusSquares": ["e4", "d5"],
  "tags": ["pin", "missed-fork"],
  "botReplySan": null OR "Bot's reply in SAN if given",
  "botReplyExplanation": null OR "One sentence — what the bot is doing"
}

focusSquares: 0-4 algebraic squares (use lower-case file letters, e.g. "e4", "d5").
tags: 0-4 short categorical tags about the move (e.g., "pin", "fork", "blunder-piece", "good-development"). Always English.`;
}
