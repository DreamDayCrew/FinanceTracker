import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';
import type { SavingsGoal } from '../lib/types';

export default function SavingsGoalsScreen() {
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
    const progressColor = progress >= 100 ? COLORS.primary : progress >= 50 ? '#f59e0b' : '#ef4444';

    return (
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={[styles.goalIcon, { backgroundColor: item.color || COLORS.primary + '20' }]}>
            <Ionicons name={(item.icon as any) || 'flag'} size={24} color={item.color || COLORS.primary} />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalName}>{item.name}</Text>
            <Text style={styles.goalStatus}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progressColor }]} />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.currentAmount}>{formatCurrency(parseFloat(item.currentAmount))}</Text>
          <Text style={styles.targetAmount}>of {formatCurrency(parseFloat(item.targetAmount))}</Text>
        </View>

        {item.targetDate && (
          <Text style={styles.targetDate}>
            Target: {new Date(item.targetDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(!goals || goals.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="flag-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Savings Goals</Text>
          <Text style={styles.emptySubtitle}>Create goals in the web app to track them here</Text>
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
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  goalCard: {
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
  },
  goalStatus: {
    fontSize: 12,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.border,
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
    color: COLORS.text,
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
    color: COLORS.primary,
  },
  targetAmount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  targetDate: {
    fontSize: 12,
    color: COLORS.textMuted,
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
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
