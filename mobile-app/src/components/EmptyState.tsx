import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, spacing} from '../constants/theme';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({title, message, actionLabel, onAction}: EmptyStateProps): React.JSX.Element => (
  <View style={styles.container} accessibilityRole="summary">
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionLabel && onAction ? (
      <TouchableOpacity style={styles.button} onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {alignItems: 'center', padding: spacing.xl},
  title: {color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm},
  message: {color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg},
  button: {backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.md},
  buttonText: {color: colors.text, fontWeight: '700'},
});
