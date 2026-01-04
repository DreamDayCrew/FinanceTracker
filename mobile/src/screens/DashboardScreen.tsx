import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getThemedColors, getOrdinalSuffix } from '../lib/utils';
import { RootStackParamList, TabParamList } from '../../App';
import { FABButton } from '../components/FABButton';
import { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load dashboard</Text>
        <Text style={[styles.errorSubtext, { color: colors.textMuted }]}>Check your internet connection</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Today</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(data?.totalSpentToday || 0)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>This Month</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(data?.totalSpentMonth || 0)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Tracking</Text>
          {data?.budgetUsage && data.budgetUsage.length > 0 ? (
            data.budgetUsage.slice(0, 3).map((budget) => (
              <View key={budget.categoryId} style={[styles.budgetItem, { backgroundColor: colors.card }]}>
                <View style={styles.budgetHeader}>
                  <Text style={[styles.budgetName, { color: colors.text }]}>{budget.categoryName}</Text>
                  <Text style={[styles.budgetAmount, { color: colors.textMuted }]}>
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.budget)}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min(budget.percentage, 100)}%`,
                        backgroundColor: budget.percentage >= 100 ? colors.danger : 
                          budget.percentage >= 80 ? colors.warning : colors.primary
                      }
                    ]} 
                  />
                </View>
              </View>
            ))
          ) : (
            <TouchableOpacity 
              style={[styles.emptyCard, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('More')}
            >
              <Ionicons name="pie-chart-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No budgets set</Text>
              <Text style={[styles.emptySubtext, { color: colors.primary }]}>Tap to add a budget</Text>
            </TouchableOpacity>
          )}
        </View>

        {data?.nextScheduledPayment && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Payment</Text>
            <View style={[styles.paymentCard, { backgroundColor: colors.card }]}>
              <View>
                <Text style={[styles.paymentName, { color: colors.text }]}>{data.nextScheduledPayment.name}</Text>
                <Text style={[styles.paymentDue, { color: colors.textMuted }]}>
                  Due: {data.nextScheduledPayment.dueDate}{getOrdinalSuffix(data.nextScheduledPayment.dueDate)} of each month
                </Text>
              </View>
              <Text style={[styles.paymentAmount, { color: colors.primary }]}>{formatCurrency(data.nextScheduledPayment.amount)}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {data?.lastTransactions && data.lastTransactions.length > 0 ? (
            data.lastTransactions.map((transaction) => (
              <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionMerchant, { color: colors.text }]}>
                    {transaction.merchant || transaction.category?.name || 'Transaction'}
                  </Text>
                  <Text style={[styles.transactionDate, { color: colors.textMuted }]}>{formatDate(transaction.transactionDate)}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'credit' ? colors.primary : colors.danger }
                ]}>
                  {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions yet</Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
      
      <FABButton onPress={() => navigation.navigate('AddTransaction')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetName: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetAmount: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '500',
  },
  paymentDue: {
    fontSize: 12,
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 15,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
});
