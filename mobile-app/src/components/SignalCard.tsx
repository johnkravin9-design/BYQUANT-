import React, {memo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, spacing} from '../constants/theme';
import {Signal} from '../types/signal';
import {SignalMetric} from './SignalMetric';

const usd = (value: number): string => `$${value.toLocaleString(undefined, {maximumFractionDigits: 8})}`;
export const formatSignalAge = (createdAt: string, now = Date.now()): string => {
  const diffMs = Math.max(0, now - new Date(createdAt).getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

interface SignalCardProps {
  signal: Signal;
  isFavorite: boolean;
  onPress: (signal: Signal) => void;
  onToggleFavorite: (symbol: string) => void;
}

export const SignalCard = memo(({signal, isFavorite, onPress, onToggleFavorite}: SignalCardProps): React.JSX.Element => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(signal)} accessibilityRole="button" accessibilityLabel={`${signal.symbol} ${signal.direction} signal details`}>
    <View style={styles.header}>
      <View>
        <Text style={styles.symbol}>{signal.symbol}</Text>
        <Text style={styles.age}>{signal.timeframe} · {formatSignalAge(signal.created_at)}</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => onToggleFavorite(signal.symbol)} accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Remove' : 'Add'} ${signal.symbol} favorite`}>
          <Text style={styles.favorite}>{isFavorite ? '★' : '☆'}</Text>
        </TouchableOpacity>
        <Text style={styles.buy}>{signal.direction}</Text>
      </View>
    </View>
    <View style={styles.metrics}>
      <SignalMetric label="Entry" value={usd(signal.entry_price)} />
      <SignalMetric label="Stop Loss" value={usd(signal.stop_loss)} tone="risk" />
      <SignalMetric label="TP1" value={usd(signal.take_profit_1)} tone="profit" />
      <SignalMetric label="TP2" value={usd(signal.take_profit_2)} tone="profit" />
      <SignalMetric label="TP3" value={usd(signal.take_profit_3)} tone="profit" />
    </View>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  card: {backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg},
  headerActions: {alignItems: 'center', flexDirection: 'row', gap: spacing.md},
  symbol: {color: colors.text, fontSize: 22, fontWeight: '800'},
  age: {color: colors.textMuted, marginTop: spacing.xs},
  favorite: {color: colors.warning, fontSize: 24},
  buy: {backgroundColor: colors.buy, borderRadius: 999, color: colors.background, fontWeight: '900', overflow: 'hidden', paddingHorizontal: spacing.md, paddingVertical: spacing.xs},
  metrics: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
});
