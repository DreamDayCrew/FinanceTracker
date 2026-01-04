import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';
import type { SalaryProfile } from '../lib/types';

export default function SalaryScreen() {
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
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <View style={styles.profileIcon}>
          <Ionicons name="briefcase" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.employerName}>{item.employerName}</Text>
          <Text style={styles.salaryAmount}>{formatCurrency(parseFloat(item.monthlySalary))}/month</Text>
        </View>
        <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.detailText}>Pay day: {item.payDay}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{getPayDayRuleLabel(item.payDayRule)}</Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(!profiles || profiles.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Salary Profiles</Text>
          <Text style={styles.emptySubtitle}>Add your salary details in the web app</Text>
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
  profileCard: {
    backgroundColor: COLORS.card,
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
    backgroundColor: COLORS.primary + '20',
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
    color: COLORS.text,
  },
  salaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: COLORS.primary + '20',
  },
  inactiveBadge: {
    backgroundColor: COLORS.textMuted + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: COLORS.primary,
  },
  inactiveText: {
    color: COLORS.textMuted,
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
    color: COLORS.textMuted,
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
