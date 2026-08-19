import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {getActiveSignals} from '../api/client';
import {EmptyState} from '../components/EmptyState';
import {SignalCard} from '../components/SignalCard';
import {colors, spacing} from '../constants/theme';
import {toggleFavoriteSymbol} from '../state/favorites';
import {Signal} from '../types/signal';

interface SignalDashboardProps { onSelectSignal?: (signal: Signal) => void; }

export const SignalDashboard = ({onSelectSignal}: SignalDashboardProps): React.JSX.Element => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSignals = useCallback(async (isRefresh = false): Promise<void> => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setSignals(await getActiveSignals({limit: 50}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load signals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadSignals(false); }, [loadSignals]);

  const onToggleFavorite = useCallback((symbol: string) => setFavorites(current => toggleFavoriteSymbol(current, symbol)), []);
  const renderItem = useCallback(({item}: {item: Signal}) => (
    <SignalCard signal={item} isFavorite={favorites.has(item.symbol)} onPress={onSelectSignal ?? (() => undefined)} onToggleFavorite={onToggleFavorite} />
  ), [favorites, onSelectSignal, onToggleFavorite]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.buy} /><Text style={styles.muted}>Loading latest signals…</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>BYQUANT</Text>
          <Text style={styles.title}>Latest Signals</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => void loadSignals(true)} accessibilityRole="button" accessibilityLabel="Refresh latest signals">
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {error ? <EmptyState title="Connection issue" message={error} actionLabel="Retry" onAction={() => void loadSignals(false)} /> : null}
      {!error ? (
        <FlatList
          data={signals}
          keyExtractor={item => item.signal_id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadSignals(true)} tintColor={colors.buy} />}
          ListEmptyComponent={<EmptyState title="No active signals" message="ByQuant has no active spot-market signals right now." actionLabel="Refresh" onAction={() => void loadSignals(true)} />}
          contentContainerStyle={signals.length ? styles.list : styles.emptyList}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {backgroundColor: colors.background, flex: 1},
  center: {alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center'},
  muted: {color: colors.textMuted, marginTop: spacing.md},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg},
  kicker: {color: colors.buy, fontSize: 12, fontWeight: '900', letterSpacing: 2},
  title: {color: colors.text, fontSize: 30, fontWeight: '900'},
  refreshButton: {backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: 10, borderWidth: 1, padding: spacing.md},
  refreshText: {color: colors.text, fontWeight: '700'},
  list: {paddingBottom: spacing.xl},
  emptyList: {flexGrow: 1, justifyContent: 'center'},
});
