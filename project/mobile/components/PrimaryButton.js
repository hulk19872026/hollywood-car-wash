import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, radius, spacing } from './theme';

/**
 * <PrimaryButton title="Go" onPress={fn} loading={bool} disabled={bool} variant="primary|secondary|ghost" />
 */
export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon = null,
  style,
}) {
  const isDisabled = disabled || loading;
  const variantStyle = styles[`v_${variant}`] || styles.v_primary;
  const textStyle = styles[`t_${variant}`] || styles.t_primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} />
      ) : (
        <View style={styles.row}>
          {icon ? <Text style={[textStyle, { marginRight: 8 }]}>{icon}</Text> : null}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },

  v_primary: { backgroundColor: colors.primary },
  t_primary: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },

  v_secondary: { backgroundColor: colors.chip },
  t_secondary: { color: colors.chipText, fontSize: 16, fontWeight: '700' },

  v_ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  t_ghost: { color: colors.text, fontSize: 16, fontWeight: '600' },

  v_danger: { backgroundColor: colors.danger },
  t_danger: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
