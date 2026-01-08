import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { api, API_BASE_URL } from '../lib/api';
import { formatCurrency, formatDate, getThemedColors, getOrdinalSuffix } from '../lib/utils';
import { RootStackParamList, TabParamList } from '../../App';
import { FABButton } from '../components/FABButton';
import { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Payday {
  month: number;
  year: number;
  date: string;
}
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

  const { data: monthlyExpenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['monthlyExpenses'],
    queryFn: api.getMonthlyExpenses,
  });

  const { data: monthlyCreditCardSpending } = useQuery({
    queryKey: ['monthlyCreditCardSpending'],
    queryFn: api.getMonthlyCreditCardSpending,
  });

  const { data: nextPaydays = [] } = useQuery<Payday[]>({
    queryKey: ['salary-profile-paydays'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/salary-profile/next-paydays?count=1`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: paymentOccurrences = [] } = useQuery({
    queryKey: ['payment-occurrences-current'],
    queryFn: async () => {
      const now = new Date();
      const res = await fetch(`${API_BASE_URL}/api/payment-occurrences?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: savingsGoals = [] } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/savings-goals`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: insurances = [] } = useQuery({
    queryKey: ['insurances'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/insurances`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const nextPayday = nextPaydays.length > 0 ? nextPaydays[0] : null;
  const daysUntilPayday = useMemo(() => {
    if (!nextPayday) return null;
    const today = new Date();
    const paydayDate = new Date(nextPayday.date);
    const diffTime = paydayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [nextPayday]);

  const paymentStats = useMemo(() => {
    const total = paymentOccurrences.length;
    const completed = paymentOccurrences.filter((p: any) => p.status === 'paid').length;
    return { total, completed };
  }, [paymentOccurrences]);

  const savingsStats = useMemo(() => {
    const activeGoals = savingsGoals.filter((g: any) => g.status === 'active');
    const totalTarget = activeGoals.reduce((sum: number, g: any) => sum + parseFloat(g.targetAmount || '0'), 0);
    const totalSaved = activeGoals.reduce((sum: number, g: any) => sum + parseFloat(g.currentAmount || '0'), 0);
    return { totalTarget, totalSaved, count: activeGoals.length };
  }, [savingsGoals]);

  const insuranceAlerts = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Get active insurances with renewal dates in the next 30 days
    const upcomingRenewals = insurances
      .filter((ins: any) => {
        if (ins.status !== 'active' || !ins.renewalDate) return false;
        const renewalDate = new Date(ins.renewalDate);
        return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
      })
      .map((ins: any) => ({
        ...ins,
        daysUntil: Math.ceil((new Date(ins.renewalDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

    return { upcomingRenewals };
  }, [insurances]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(), 
      queryClient.refetchQueries({ queryKey: ['monthlyExpenses'] }),
      queryClient.refetchQueries({ queryKey: ['monthlyCreditCardSpending'] }),
      queryClient.refetchQueries({ queryKey: ['salary-profile-paydays'] }),
      queryClient.refetchQueries({ queryKey: ['payment-occurrences-current'] }),
      queryClient.refetchQueries({ queryKey: ['savings-goals'] }),
      queryClient.refetchQueries({ queryKey: ['insurances'] })
    ]);
    setRefreshing(false);
  }, [refetch, queryClient]);

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

        {monthlyExpenses && monthlyExpenses.length > 0 && monthlyCreditCardSpending && monthlyCreditCardSpending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Trend</Text>
              {/*<View style={styles.viewDetailsContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('ExpenseDetails')} style={styles.viewDetailsButton}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>Expenses</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
                <View style={[styles.viewDetailsDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity onPress={() => navigation.navigate('CreditCardDetails')} style={styles.viewDetailsButton}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>Credit Card</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>*/}
            </View>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              {/*<View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Expenses</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                  <Text style={[styles.legendText, { color: colors.text }]}>Credit Card</Text>
                </View>
              </View>*/}
              <LineChart
                data={{
                  labels: monthlyExpenses.map(m => m.month),
                  datasets: [
                    {
                      data: monthlyExpenses.map(m => m.expenses || 0),
                      color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                      strokeWidth: 2,
                    },
                    {
                      data: monthlyCreditCardSpending.map(m => m.spending || 0),
                      color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                      strokeWidth: 2,
                    }
                  ],
                  legend: ['Expenses', 'Credit Card']
                }}
                width={Dimensions.get('window').width - 64}
                height={220}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                  labelColor: (opacity = 1) => resolvedTheme === 'dark' 
                    ? `rgba(255, 255, 255, ${opacity * 0.6})` 
                    : `rgba(0, 0, 0, ${opacity * 0.6})`,
                  style: {
                    borderRadius: 12,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                  }
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 12,
                }}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={true}
                withHorizontalLines={true}
              />
            </View>
          </View>
        )}

        {/* Three Column Stats Row */}
        {((nextPayday && daysUntilPayday !== null) || paymentStats.total > 0 || savingsStats.count > 0) && (
          <View style={styles.threeColumnRow}>
            {/* Next Payday Card */}
            {nextPayday && daysUntilPayday !== null ? (
              <TouchableOpacity 
                style={[styles.columnCard, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => navigation.navigate('Salary' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.columnCardHeader}>
                  <Ionicons name="wallet" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.columnCardLabel, { color: colors.textMuted }]}>Next Payday</Text>
                <Text style={[styles.columnCardValue, { color: colors.primary }]}>
                  {daysUntilPayday === 0 ? 'Today!' : daysUntilPayday === 1 ? 'Tomorrow' : `${daysUntilPayday} days`}
                </Text>
                <Text style={[styles.columnCardSubtext, { color: colors.textMuted }]}>
                  {new Date(nextPayday.date).toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </Text>
              </TouchableOpacity>
            ) : <View style={styles.columnCard} />}

            {/* Scheduled Payments Card */}
            {paymentStats.total > 0 ? (
              <TouchableOpacity 
                style={[styles.columnCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('ScheduledPayments' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.columnCardHeader}>
                  <Ionicons name="calendar-outline" size={20} color={colors.text} />
                </View>
                <Text style={[styles.columnCardLabel, { color: colors.textMuted }]}>Payments</Text>
                <Text style={[styles.columnCardValue, { color: colors.primary }]}>
                  {paymentStats.completed}/{paymentStats.total}
                </Text>
                <View style={styles.columnProgressBar}>
                  <View style={[styles.columnProgressFill, { 
                    width: `${paymentStats.total > 0 ? (paymentStats.completed / paymentStats.total) * 100 : 0}%`,
                    backgroundColor: colors.primary 
                  }]} />
                </View>
              </TouchableOpacity>
            ) : <View style={styles.columnCard} />}

            {/* Savings Goals Card */}
            {savingsStats.count > 0 ? (
              <TouchableOpacity 
                style={[styles.columnCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('SavingsGoals' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.columnCardHeader}>
                  <Ionicons name="trophy-outline" size={20} color="#10b981" />
                </View>
                <Text style={[styles.columnCardLabel, { color: colors.textMuted }]}>Savings</Text>
                <Text style={[styles.columnCardValue, { color: '#10b981' }]}>
                  {Math.round((savingsStats.totalSaved / savingsStats.totalTarget) * 100)}%
                </Text>
                <View style={styles.columnProgressBar}>
                  <View style={[styles.columnProgressFill, { 
                    width: `${savingsStats.totalTarget > 0 ? (savingsStats.totalSaved / savingsStats.totalTarget) * 100 : 0}%`,
                    backgroundColor: '#10b981' 
                  }]} />
                </View>
              </TouchableOpacity>
            ) : <View style={styles.columnCard} />}
          </View>
        )}

        {/* Insurance Alerts Card */}
        {insuranceAlerts.upcomingRenewals.length > 0 && (
          <TouchableOpacity 
            style={[styles.insuranceCard, { backgroundColor: colors.card, borderLeftColor: '#f59e0b' }]}
            onPress={() => navigation.navigate('Insurance' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.insuranceCardHeader}>
              <View style={styles.insuranceCardTitleRow}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#f59e0b" />
                <View style={styles.insuranceCardTitleContent}>
                  <Text style={[styles.insuranceCardTitle, { color: colors.text }]}>Insurance Renewals</Text>
                  <Text style={[styles.insuranceCardSubtitle, { color: colors.textMuted }]}>
                    {insuranceAlerts.upcomingRenewals.length} renewal{insuranceAlerts.upcomingRenewals.length > 1 ? 's' : ''} due soon
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
            <View style={styles.insuranceList}>
              {insuranceAlerts.upcomingRenewals.slice(0, 3).map((ins: any, index: number) => (
                <View 
                  key={ins.id} 
                  style={[
                    styles.insuranceItem,
                    index < insuranceAlerts.upcomingRenewals.slice(0, 3).length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                  ]}
                >
                  <View style={styles.insuranceItemLeft}>
                    <Text style={[styles.insuranceItemName, { color: colors.text }]} numberOfLines={1}>
                      {ins.name}
                    </Text>
                    <Text style={[styles.insuranceItemType, { color: colors.textMuted }]}>
                      {ins.type.charAt(0).toUpperCase() + ins.type.slice(1)} Insurance
                    </Text>
                  </View>
                  <View style={styles.insuranceItemRight}>
                    <Text style={[styles.insuranceItemDays, { color: ins.daysUntil <= 7 ? '#ef4444' : '#f59e0b' }]}>
                      {ins.daysUntil === 0 ? 'Today!' : ins.daysUntil === 1 ? 'Tomorrow' : `${ins.daysUntil} days`}
                    </Text>
                    <Text style={[styles.insuranceItemDate, { color: colors.textMuted }]}>
                      {new Date(ins.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}
        
        {data?.creditCardSpending && data.creditCardSpending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Credit Card Spending</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
                <Text style={[styles.viewAll, { color: colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            {data.creditCardSpending.map((card) => {
              const hasLimit = card.limit !== null && card.limit > 0;
              const isOverLimit = hasLimit && card.percentage > 100;
              const isNearLimit = hasLimit && card.percentage >= 70 && card.percentage <= 100;
              
              return (
                <View key={card.accountId} style={[styles.creditCardItem, { backgroundColor: colors.card }]}>
                  <View style={styles.creditCardHeader}>
                    <View style={styles.creditCardInfo}>
                      <View>
                        <Text style={[styles.creditCardName, { color: colors.text }]}>{card.accountName}</Text>
                        {card.bankName && (
                          <Text style={[styles.creditCardBank, { color: colors.textMuted }]}>{card.bankName}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.creditCardAmounts}>
                      {hasLimit ? (
                        <>
                          <Text style={[
                            styles.creditCardSpent, 
                            { color: isOverLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : colors.text }
                          ]}>
                            {formatCurrency(card.spent)}
                          </Text>
                          <Text style={[styles.creditCardLimit, { color: colors.textMuted }]}>
                            of {formatCurrency(card.limit ?? 0)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.creditCardSpent, { color: colors.text }]}>
                            {formatCurrency(card.spent)}
                          </Text>
                          <Text style={[styles.creditCardLimit, { color: colors.textMuted }]}>No limit set</Text>
                        </>
                      )}
                    </View>
                  </View>
                  {hasLimit && (
                    <View style={styles.creditCardProgress}>
                      <View style={[styles.progressBar, { backgroundColor: colors.border, flex: 1 }]}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${Math.min(card.percentage, 100)}%`,
                              backgroundColor: card.color
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[
                        styles.progressText,
                        { color: isOverLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#22c55e' }
                      ]}>
                        {card.percentage}%
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

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
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsDivider: {
    width: 1,
    height: 14,
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
    height: 8,
    borderRadius: 4,
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
  nextPaydayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  nextPaydayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPaydayContent: {
    flex: 1,
  },
  nextPaydayLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  nextPaydayDate: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  nextPaydayDaysContainer: {
    alignItems: 'flex-end',
  },
  nextPaydayDays: {
    fontSize: 20,
    fontWeight: '700',
  },
  nextPaydayDaysLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  threeColumnRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  columnCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 120,
  },
  columnCardHeader: {
    marginBottom: 8,
  },
  columnCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  columnCardValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  columnCardSubtext: {
    fontSize: 11,
  },
  columnProgressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  columnProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressCardStats: {
    marginBottom: 8,
  },
  progressCardValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressCardLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  insuranceCard: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  insuranceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insuranceCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insuranceCardTitleContent: {
    flex: 1,
  },
  insuranceCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  insuranceCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  insuranceList: {
    gap: 0,
  },
  insuranceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  insuranceItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  insuranceItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  insuranceItemType: {
    fontSize: 12,
  },
  insuranceItemRight: {
    alignItems: 'flex-end',
  },
  insuranceItemDays: {
    fontSize: 14,
    fontWeight: '700',
  },
  insuranceItemDate: {
    fontSize: 12,
    marginTop: 2,
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  creditCardItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  creditCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  creditCardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  creditCardBank: {
    fontSize: 12,
    marginTop: 2,
  },
  creditCardCycle: {
    fontSize: 12,
  },
  creditCardAmounts: {
    alignItems: 'flex-end',
  },
  creditCardSpent: {
    fontSize: 20,
    fontWeight: '700',
  },
  creditCardLimit: {
    fontSize: 12,
    marginTop: 2,
  },
  creditCardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  utilizationText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
});
