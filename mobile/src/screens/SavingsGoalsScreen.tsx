import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import type { SavingsGoal } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

export default function SavingsGoalsScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  const { data: goals, isLoading } = useQuery<SavingsGoal[]>({
    queryKey: ['savings-goals'],
    queryFn: () => api.getSavingsGoals(),
  });

  const getProgress = (goal: SavingsGoal) => {
    const current = parseFloat(goal.currentAmount);
    const target = parseFloat(goal.targetAmount);
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  const renderGoal = ({ item }: { item: SavingsGoal }) => {
    const progress = getProgress(item);
    const progressColor = progress >= 100 ? colors.primary : progress >= 50 ? colors.warning : colors.danger;

    return (
      <View style={[styles.goalCard, { backgroundColor: colors.card }]}>
        <View style={styles.goalHeader}>
          <View style={[styles.goalIcon, { backgroundColor: (item.color || colors.primary) + '20' }]}>
            <Ionicons name={(item.icon as any) || 'flag'} size={24} color={item.color || colors.primary} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={[styles.goalName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.goalStatus, { color: colors.textMuted }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.text }]}>{progress.toFixed(0)}%</Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.currentAmount, { color: colors.primary }]}>{formatCurrency(parseFloat(item.currentAmount))}</Text>
          <Text style={[styles.targetAmount, { color: colors.textMuted }]}>of {formatCurrency(parseFloat(item.targetAmount))}</Text>
        </View>

        {item.targetDate && (
          <Text style={[styles.targetDate, { color: colors.textMuted }]}>
            Target: {new Date(item.targetDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {(!goals || goals.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Savings Goals</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Create goals in the web app to track them here</Text>
        </View>
      ) : (
        <FlatList
          data={goals}
          renderItem={renderGoal}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  goalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalStatus: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  targetAmount: {
    fontSize: 14,
  },
  targetDate: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
