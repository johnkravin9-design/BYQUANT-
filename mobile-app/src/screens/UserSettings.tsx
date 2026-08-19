import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import pkg from '../../package.json';
import {getApiBaseUrl} from '../api/client';
import {colors, spacing} from '../constants/theme';

interface UserSettingsProps {
  apiOnline: boolean;
  notificationsEnabled: boolean;
  favoriteSymbols: string[];
  onToggleNotifications: (enabled: boolean) => void;
}

export const UserSettings = ({apiOnline, notificationsEnabled, favoriteSymbols, onToggleNotifications}: UserSettingsProps): React.JSX.Element => (
  <View style={styles.container}>
    <Text style={styles.title}>Settings</Text>
    <Text style={styles.row}>API: {apiOnline ? 'Connected' : 'Offline or unchecked'}</Text>
    <Text style={styles.row}>Endpoint: {getApiBaseUrl()}</Text>
    <View style={styles.switchRow}>
      <Text style={styles.row}>Notifications prepared</Text>
      <Switch value={notificationsEnabled} onValueChange={onToggleNotifications} accessibilityLabel="Toggle notification preference" />
    </View>
    <Text style={styles.row}>Favorites: {favoriteSymbols.length ? favoriteSymbols.join(', ') : 'None yet'}</Text>
    <Text style={styles.row}>Version: {pkg.version}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {backgroundColor: colors.background, flex: 1, padding: spacing.lg},
  title: {color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: spacing.lg},
  row: {color: colors.text, fontSize: 16, marginBottom: spacing.md},
  switchRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
});
