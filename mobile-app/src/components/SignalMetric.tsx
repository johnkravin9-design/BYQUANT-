import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing} from '../constants/theme';

interface SignalMetricProps {
  label: string;
  value: string;
  tone?: 'default' | 'profit' | 'risk';
}

export const SignalMetric = ({label, value, tone = 'default'}: SignalMetricProps): React.JSX.Element => (
  <View style={styles.container} accessibilityLabel={`${label} ${value}`}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, tone === 'profit' && styles.profit, tone === 'risk' && styles.risk]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {minWidth: '30%', marginBottom: spacing.md},
  label: {color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs},
  value: {color: colors.text, fontSize: 16, fontWeight: '700'},
  profit: {color: colors.buy},
  risk: {color: colors.stopLoss},
});
