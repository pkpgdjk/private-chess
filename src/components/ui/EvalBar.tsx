import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { evalBarHeight, evalToDisplayString } from '@/engine/evaluator';
import { palette, radius, font } from '@/constants/design';

const { width, height } = Dimensions.get('window');
const defaultBoardSize = Math.min(width, height) * 0.92;

interface EvalBarProps {
  boardSize?: number;
  horizontal?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({ boardSize = defaultBoardSize, horizontal = false }) => {
  const showEvalBar = useSettingsStore((s) => s.showEvalBar);
  const currentEval = useGameStore((s) => s.currentEval);

  if (!showEvalBar) return null;

  const whitePct = evalBarHeight(currentEval, false, null);
  const displayString = evalToDisplayString(currentEval, false, null);

  if (horizontal) {
    return (
      <View style={[styles.hContainer, { width: boardSize, height: 14 }]}>
        <View style={[styles.hWhiteBar, { width: `${whitePct}%` }]} />
        <View style={styles.hTextOverlay}>
          <Text style={styles.hEvalText}>{displayString}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: boardSize, width: 14 }]}>
      {/* Black portion at top, white portion at bottom — like Lichess */}
      <View style={[styles.blackBar, { height: `${100 - whitePct}%` }]} />
      <View style={[styles.whiteBar, { height: `${whitePct}%` }]} />
      <View style={styles.textOverlay}>
        <Text style={styles.evalText}>{displayString}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  blackBar: {
    backgroundColor: palette.bg,
    width: '100%',
  },
  whiteBar: {
    backgroundColor: palette.text,
    width: '100%',
  },
  textOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  evalText: {
    color: palette.text,
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  hContainer: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: palette.bg,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  hWhiteBar: {
    backgroundColor: palette.text,
    height: '100%',
  },
  hTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hEvalText: {
    color: palette.text,
    fontSize: font.tiny,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});
