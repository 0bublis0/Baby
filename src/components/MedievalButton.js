import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export default function MedievalButton({ title, onPress, disabled, variant = 'primary', size = 'normal', style }) {
  const isLarge = size === 'large';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  const bgColor = disabled
    ? '#2a1a0a'
    : isDanger
    ? '#5a0a0a'
    : isGhost
    ? 'transparent'
    : '#2a1a00';

  const borderColor = disabled
    ? '#4a3a2a'
    : isDanger
    ? '#cc2244'
    : colors.gold;

  const textColor = disabled
    ? '#4a3a2a'
    : isDanger
    ? '#ff6688'
    : colors.gold;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor,
          paddingVertical: isLarge ? 18 : 12,
          paddingHorizontal: isLarge ? 36 : 24,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text style={[styles.text, { color: textColor, fontSize: isLarge ? 18 : 15 }]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
