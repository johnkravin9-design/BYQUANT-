import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing} from '../constants/theme';
import {Signal} from '../types/signal';
import {SignalMetric} from '../components/SignalMetric';

interface SignalDetailsProps { signal: Signal; }
const usd = (value: number): string => `$${value.toLocaleString(undefined, {maximumFractionDigits: 8})}`;

export const SignalDetails = ({signal}: SignalDetailsProps): React.JSX.Element => (
  <View style={styles.container}>
    <Text style={styles.title}>{signal.symbol}</Text>
    <Text style={styles.badge}>{signal.direction}</Text>
    <View style={styles.grid}>
      <SignalMetric label="Entry" value={usd(signal.entry_price)} />
      <SignalMetric label="Stop Loss" value={usd(signal.stop_loss)} tone="risk" />
      <SignalMetric label="TP1" value={usd(signal.take_profit_1)} tone="profit" />
      <SignalMetric label="TP2" value={usd(signal.take_profit_2)} tone="profit" />
      <SignalMetric label="TP3" value={usd(signal.take_profit_3)} tone="profit" />
      <SignalMetric label="Timeframe" value={signal.timeframe} />
    </View>
    <Text style={styles.timestamp}>Candle: {new Date(signal.candle_timestamp).toLocaleString()}</Text>
    <Text style={styles.timestamp}>Created: {new Date(signal.created_at).toLocaleString()}</Text>
    <Text style={styles.disclaimer}>ByQuant provides quantitative spot-market signals, not guarantees of profit. Always manage risk.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {backgroundColor: colors.background, flex: 1, padding: spacing.lg},
  title: {color: colors.text, fontSize: 30, fontWeight: '900'},
  badge: {alignSelf: 'flex-start', backgroundColor: colors.buy, borderRadius: 999, color: colors.background, fontWeight: '900', marginVertical: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  grid: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', padding: spacing.lg},
  timestamp: {color: colors.textMuted, marginTop: spacing.md},
  disclaimer: {color: colors.warning, lineHeight: 20, marginTop: spacing.xl},
});
