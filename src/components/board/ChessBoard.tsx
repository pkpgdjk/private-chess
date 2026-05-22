import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { Chess } from 'chess.js';
import { Piece } from './Piece';
import { MoveOverlay } from './MoveOverlay';
import { HintArrow } from './HintArrow';
import { FocusOverlay } from './FocusOverlay';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/constants/colors';
import { palette, radius, shadow } from '@/constants/design';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const boardThemes = {
  classic: { light: '#f5e0dc', dark: '#6c7086' },
  dark: { light: '#94e2d5', dark: '#45475a' },
  marble: { light: '#b4befe', dark: '#313244' },
};

const { width, height } = Dimensions.get('window');

interface ChessBoardProps {
  onSquarePress?: (square: string) => void;
}

export const ChessBoard = React.memo(({ onSquarePress }: ChessBoardProps) => {
  const fen = useGameStore((s) => s.fen);
  const turn = useGameStore((s) => s.turn);
  const selectedSquare = useGameStore((s) => s.selectedSquare);
  const legalMoves = useGameStore((s) => s.legalMoves);
  const lastMove = useGameStore((s) => s.lastMove);
  const selectSquare = useGameStore((s) => s.selectSquare);
  const hintMove = useGameStore((s) => s.hintMove);
  const history = useGameStore((s) => s.history);
  const currentMoveIndex = useGameStore((s) => s.currentMoveIndex);
  const playerColor = useGameStore((s) => s.playerColor);

  // Was the very last move made by the bot? If so we paint its from/to
  // squares with a stronger highlight so the player can immediately see
  // what was just played against them.
  const lastMoveByBot =
    history.length > 0 &&
    currentMoveIndex === history.length - 1 &&
    history[history.length - 1].player !== playerColor;

  // The player's analyzed move is one before the bot's reply, so pull
  // focusSquares from the player's move node when available.
  const focusSquares = (() => {
    if (currentMoveIndex < 0) return [];
    const current = history[currentMoveIndex];
    if (current?.focusSquares?.length) return current.focusSquares;
    // Fall back to the player's prior move if the latest is the bot's.
    const prior = currentMoveIndex > 0 ? history[currentMoveIndex - 1] : null;
    return prior?.focusSquares ?? [];
  })();

  const boardTheme = useSettingsStore((s) => s.boardTheme);
  const flipBoard = useSettingsStore((s) => s.flipBoard);
  const showCoordinates = useSettingsStore((s) => s.boardCoordinates);
  const showLegalMoves = useSettingsStore((s) => s.legalMoveOverlay);
  const showArrows = useSettingsStore((s) => s.showArrows);

  const squareSize = Math.floor((Math.min(width, height) * 0.92) / 8);
  const boardPx = squareSize * 8;

  const { board, kingSquare } = useMemo(() => {
    const chess = new Chess(fen);
    const b = chess.board();
    let kSquare: string | null = null;
    if (chess.isCheck()) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = b[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            kSquare = `${files[c]}${8 - r}`;
            break;
          }
        }
        if (kSquare) break;
      }
    }
    return { board: b, kingSquare: kSquare };
  }, [fen, turn]);

  const theme = boardThemes[boardTheme] ?? boardThemes.classic;
  const rowOrder = flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const colOrder = flipBoard ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const handlePress = (square: string) => {
    if (onSquarePress) onSquarePress(square);
    else selectSquare(square);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.board, { width: boardPx, height: boardPx }]}>
        {rowOrder.map((boardRow, r) => (
          <View key={r} style={styles.row}>
            {colOrder.map((boardCol, c) => {
              const square = `${files[boardCol]}${8 - boardRow}`;
              const piece = board[boardRow][boardCol];
              const isLight = (boardRow + boardCol) % 2 === 0;
              const bgColor = isLight ? theme.light : theme.dark;

              const isSelected = selectedSquare === square;
              const isLegal = legalMoves.includes(square);
              const isCapture = isLegal && piece !== null && piece.color !== turn;
              const isLastMove =
                lastMove !== null && (lastMove.from === square || lastMove.to === square);
              const isCheck = kingSquare === square;

              const showFile = r === 7;
              const showRank = c === 0;

              return (
                <Pressable
                  key={c}
                  onPress={() => handlePress(square)}
                  style={[
                    styles.square,
                    { width: squareSize, height: squareSize, backgroundColor: bgColor },
                  ]}
                >
                  {/* Last-move tint (behind everything). When the move was
                      the bot's, use a louder peach tint + border so the
                      player can immediately spot the opponent's reply. */}
                  {isLastMove && (
                    <View
                      style={[
                        styles.fill,
                        lastMoveByBot
                          ? {
                              backgroundColor: 'rgba(250, 179, 135, 0.55)', // Catppuccin peach
                              borderWidth: 3,
                              borderColor: 'rgba(250, 179, 135, 0.95)',
                            }
                          : { backgroundColor: colors.lastMove },
                      ]}
                      pointerEvents="none"
                    />
                  )}
                  {isSelected && (
                    <View
                      style={[
                        styles.fill,
                        { backgroundColor: 'rgba(166, 227, 161, 0.4)' },
                      ]}
                      pointerEvents="none"
                    />
                  )}
                  {isCheck && (
                    <View
                      style={[styles.fill, { backgroundColor: colors.checkHighlight }]}
                      pointerEvents="none"
                    />
                  )}

                  {/* Coordinate labels */}
                  {showCoordinates && showFile && (
                    <Text
                      style={[
                        styles.coordFile,
                        { color: isLight ? theme.dark : theme.light },
                      ]}
                    >
                      {files[boardCol]}
                    </Text>
                  )}
                  {showCoordinates && showRank && (
                    <Text
                      style={[
                        styles.coordRank,
                        { color: isLight ? theme.dark : theme.light },
                      ]}
                    >
                      {8 - boardRow}
                    </Text>
                  )}

                  {/* Piece */}
                  {piece && (
                    <Piece piece={piece.type} color={piece.color} size={squareSize} />
                  )}

                  {/* Move dots / capture rings on top */}
                  {showLegalMoves && (
                    <MoveOverlay
                      square={square}
                      isLegal={isLegal}
                      isCapture={isCapture}
                      squareSize={squareSize}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
        {hintMove && showArrows && (
          <HintArrow
            from={hintMove.from}
            to={hintMove.to}
            squareSize={squareSize}
            flipBoard={flipBoard}
          />
        )}
        {focusSquares.length > 0 && (
          <FocusOverlay squares={focusSquares} squareSize={squareSize} flipBoard={flipBoard} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    backgroundColor: palette.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    ...shadow.soft,
  },
  board: {
    flexDirection: 'column',
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coordFile: {
    position: 'absolute',
    bottom: 1,
    right: 3,
    fontSize: 9,
    fontWeight: '900',
    opacity: 0.7,
  },
  coordRank: {
    position: 'absolute',
    top: 1,
    left: 3,
    fontSize: 9,
    fontWeight: '900',
    opacity: 0.7,
  },
});
