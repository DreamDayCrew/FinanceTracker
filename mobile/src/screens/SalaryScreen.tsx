import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import type { SalaryProfile } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

export default function SalaryScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  const { data: profiles, isLoading } = useQuery<SalaryProfile[]>({
    queryKey: ['salary-profiles'],
    queryFn: () => api.getSalaryProfiles(),
  });

  const getPayDayRuleLabel = (rule: string) => {
    switch (rule) {
      case 'exact': return 'Exact day';
      case 'before_weekend': return 'Before weekend';
      case 'after_weekend': return 'After weekend';
      case 'last_working_day': return 'Last working day';
      default: return rule;
    }
  };

  const renderProfile = ({ item }: { item: SalaryProfile }) => (
    <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="briefcase" size={24} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.employerName, { color: colors.text }]}>{item.employerName}</Text>
          <Text style={[styles.salaryAmount, { color: colors.primary }]}>{formatCurrency(parseFloat(item.monthlySalary))}/month</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? colors.primary + '20' : colors.textMuted + '20' }]}>
          <Text style={[styles.statusText, { color: item.isActive ? colors.primary : colors.textMuted }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textMuted }]}>Pay day: {item.payDay}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.detailText, { color: colors.textMuted }]}>{getPayDayRuleLabel(item.payDayRule)}</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {(!profiles || profiles.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Salary Profiles</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Add your salary details in the web app</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfile}
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
  profileCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  employerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  salaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
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
