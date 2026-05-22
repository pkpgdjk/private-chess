import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

const PIECE_CHARS = '♔♕♖♗♘♙♚♛♜♝♞♟';
const PIECE_SPLIT = /([♔♕♖♗♘♙♚♛♜♝♞♟])/g;

interface ChessTextProps {
  children: string | null | undefined;
  style?: StyleProp<TextStyle>;
  /** Multiplier applied to the parent fontSize for chess glyphs. */
  glyphScale?: number;
  numberOfLines?: number;
}

/**
 * Renders text inline, enlarging Unicode chess glyphs (♔♕♖♗♘♙♚♛♜♝♞♟)
 * so they stand out against the surrounding prose.
 */
export const ChessText: React.FC<ChessTextProps> = ({
  children,
  style,
  glyphScale = 1.5,
  numberOfLines,
}) => {
  if (!children) return null;

  const baseFontSize =
    (style && !Array.isArray(style) && typeof (style as TextStyle).fontSize === 'number'
      ? (style as TextStyle).fontSize
      : undefined) ?? 14;

  const parts = String(children).split(PIECE_SPLIT);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => {
        if (part.length === 1 && PIECE_CHARS.includes(part)) {
          return (
            <Text
              key={i}
              style={{
                fontSize: baseFontSize * glyphScale,
                lineHeight: baseFontSize * glyphScale,
              }}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};
