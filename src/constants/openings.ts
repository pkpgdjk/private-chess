export const openingMap: Record<string, string> = {
  'e4 e5 Nf3 Nc6 Bc4': 'Italian Game',
  'e4 e5 Nf3 Nc6 Bb5': 'Ruy Lopez',
  'e4 c5': 'Sicilian Defense',
  'e4 e6': 'French Defense',
  'e4 c6': 'Caro-Kann Defense',
  'd4 d5': 'Queen\'s Pawn Game',
  'd4 Nf6': 'Indian Defenses',
  'e4 e5 f4': 'King\'s Gambit',
  'e4 e5 Nf3 Nf6': 'Petrov\'s Defense',
  'e4 d5': 'Scandinavian Defense',
  'c4': 'English Opening',
  'Nf3': 'Reti Opening',
  'g3': 'King\'s Indian Attack',
  'e4 Nc6': 'Nimzowitsch Defense',
};

export function getOpeningName(moveHistory: string[]): string | null {
  // Check progressively longer prefixes
  for (let i = moveHistory.length; i > 0; i--) {
    const key = moveHistory.slice(0, i).join(' ');
    if (openingMap[key]) return openingMap[key];
  }
  return null;
}
