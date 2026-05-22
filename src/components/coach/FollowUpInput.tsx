import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { palette, radius, space, font } from '@/constants/design';

interface FollowUpInputProps {
  onSubmit?: (text: string) => void;
}

export const FollowUpInput: React.FC<FollowUpInputProps> = React.memo(({ onSubmit }) => {
  const [text, setText] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && onSubmit) {
      onSubmit(trimmed);
      setText('');
    }
  }, [text, onSubmit]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ask the coach"
        placeholderTextColor={palette.faint}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        multiline={false}
      />
      <Pressable
        style={({ pressed }) => [styles.sendButton, pressed && styles.sendButtonPressed]}
        onPress={handleSubmit}
        disabled={!text.trim()}
      >
        <Text style={[styles.sendArrow, !text.trim() && styles.sendArrowDisabled]}>Send</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginTop: space.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: font.body,
    paddingVertical: 4,
  },
  sendButton: {
    minWidth: 54,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: space.sm,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendArrow: {
    color: palette.bg,
    fontSize: font.sm,
    fontWeight: '900',
  },
  sendArrowDisabled: {
    opacity: 0.5,
  },
});
