import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from './theme';

export default function Header({ title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  inner: {},
  title: { color: colors.onPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: colors.onPrimaryMuted, fontSize: 14, marginTop: 4 },
});
