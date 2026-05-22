import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { palette, radius, space, font } from '@/constants/design';

interface SettingToggleProps {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  description?: string;
}

export const SettingToggle: React.FC<SettingToggleProps> = ({
  label,
  value,
  onValueChange,
  description,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: palette.panel, true: palette.primary }}
          thumbColor={value ? palette.pink : palette.faint}
          ios_backgroundColor={palette.panel}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: space.md,
    marginVertical: space.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: space.md,
  },
  label: {
    color: palette.text,
    fontSize: font.body,
    fontWeight: '800',
  },
  description: {
    color: palette.muted,
    fontSize: font.sm,
    marginTop: 3,
  },
});
