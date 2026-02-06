import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { RootStackParamList, TabParamList } from '../../App';
import { FABButton } from '../components/FABButton';
import { useState, useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { username } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['/api/dashboard-summary'],
    queryFn: api.getDashboardSummary,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ['/api/dashboard-summary'] });
    setRefreshing(false);
  }, [queryClient]);

  if (isLoading || !summary) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  const netBalance = summary.totalIncome - summary.totalSpent;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back,</Text>
            <Text style={[styles.username, { color: colors.text }]}>{username || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.monthBadge, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>
              {summary.monthLabel}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} data-testid="button-settings">
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Income / Spent / Bills Due */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: '#10b981' + '18' }]}>
              <Ionicons name="arrow-down-outline" size={18} color="#10b981" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: '#10b981' }]} numberOfLines={1} data-testid="text-income">
              {formatCurrency(summary.totalIncome)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: '#ef4444' + '18' }]}>
              <Ionicons name="arrow-up-outline" size={18} color="#ef4444" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Spent</Text>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]} numberOfLines={1} data-testid="text-spent">
              {formatCurrency(summary.totalSpent)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: '#f59e0b' + '18' }]}>
              <Ionicons name="time-outline" size={18} color="#f59e0b" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bills Due</Text>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]} numberOfLines={1} data-testid="text-bills-due">
              {formatCurrency(summary.billsDue)}
            </Text>
          </View>
        </View>

        {/* Net Balance Bar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.netRow}>
            <Text style={[styles.netLabel, { color: colors.textMuted }]}>Net Balance</Text>
            <Text style={[styles.netValue, { color: netBalance >= 0 ? '#10b981' : '#ef4444' }]} data-testid="text-net-balance">
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </Text>
          </View>
          {summary.totalIncome > 0 && (
            <View style={[styles.netProgressBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.netProgressFill,
                  {
                    width: `${Math.min((summary.totalSpent / summary.totalIncome) * 100, 100)}%`,
                    backgroundColor: summary.totalSpent / summary.totalIncome > 0.8 ? '#ef4444' :
                      summary.totalSpent / summary.totalIncome > 0.6 ? '#f59e0b' : '#10b981',
                  },
                ]}
              />
            </View>
          )}
          <Text style={[styles.todaySpent, { color: colors.textMuted }]}>
            Today: {formatCurrency(summary.totalSpentToday)}
          </Text>
        </View>

        {/* Top Spending Categories */}
        {summary.topCategories.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Top Spending</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ExpenseDetails' as any)} data-testid="button-view-expenses">
                <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {summary.topCategories.map((cat) => {
              const pct = summary.totalSpent > 0 ? Math.round((cat.total / summary.totalSpent) * 100) : 0;
              return (
                <View key={cat.categoryId} style={styles.categoryRow} data-testid={`row-category-${cat.categoryId}`}>
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={(cat.icon as any) || 'ellipsis-horizontal'} size={16} color={cat.color} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <View style={styles.categoryNameRow}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                      <Text style={[styles.categoryAmt, { color: colors.text }]}>{formatCurrency(cat.total)}</Text>
                    </View>
                    <View style={[styles.categoryBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.categoryBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                  <Text style={[styles.categoryPct, { color: colors.textMuted }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Budget Tracking */}
        {summary.budgetUsage.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Budget Tracking</Text>
              <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
            </View>
            {summary.budgetUsage.map((budget) => (
              <View key={budget.categoryId} style={styles.budgetItem} data-testid={`row-budget-${budget.categoryId}`}>
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
                        backgroundColor: budget.percentage >= 100 ? '#ef4444' :
                          budget.percentage >= 80 ? '#f59e0b' : colors.primary
                      }
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Credit Card Spending */}
        {summary.creditCardSpending.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Credit Cards</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreditCardDetails' as any)} data-testid="button-view-credit-cards">
                <Text style={[styles.viewAll, { color: colors.primary }]}>Details</Text>
              </TouchableOpacity>
            </View>
            {summary.creditCardSpending.map((card) => {
              const hasLimit = card.limit !== null && card.limit > 0;
              return (
                <View key={card.accountId} style={styles.ccRow} data-testid={`row-cc-${card.accountId}`}>
                  <View style={styles.ccInfo}>
                    <Text style={[styles.ccName, { color: colors.text }]} numberOfLines={1}>{card.accountName}</Text>
                    {card.bankName ? <Text style={[styles.ccBank, { color: colors.textMuted }]}>{card.bankName}</Text> : null}
                  </View>
                  <View style={styles.ccRight}>
                    <Text style={[styles.ccSpent, { color: card.percentage >= 100 ? '#ef4444' : card.percentage >= 80 ? '#f59e0b' : colors.text }]}>
                      {formatCurrency(card.spent)}
                    </Text>
                    {hasLimit && (
                      <Text style={[styles.ccLimit, { color: colors.textMuted }]}>/ {formatCurrency(card.limit!)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Upcoming Bills */}
        {summary.upcomingBills.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Upcoming Bills</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ScheduledPayments' as any)} data-testid="button-view-bills">
                <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {summary.upcomingBills.map((bill) => (
              <View key={bill.id} style={styles.billRow} data-testid={`row-bill-${bill.id}`}>
                <View style={[styles.billIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.billInfo}>
                  <Text style={[styles.billName, { color: colors.text }]} numberOfLines={1}>{bill.name}</Text>
                  <Text style={[styles.billDue, { color: colors.textMuted }]}>
                    Due: {bill.dueDate ? `Day ${bill.dueDate}` : '-'}
                  </Text>
                </View>
                <Text style={[styles.billAmt, { color: colors.text }]}>
                  {formatCurrency(parseFloat(bill.amount || '0'))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Loans & EMI Summary */}
        {summary.activeLoansCount > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Loans & EMI</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Loans' as any)} data-testid="button-view-loans">
                <Text style={[styles.viewAll, { color: colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.loanRow}>
              <View style={styles.loanStat}>
                <Text style={[styles.loanStatLabel, { color: colors.textMuted }]}>Active Loans</Text>
                <Text style={[styles.loanStatValue, { color: colors.text }]}>{summary.activeLoansCount}</Text>
              </View>
              <View style={[styles.loanDivider, { backgroundColor: colors.border }]} />
              <View style={styles.loanStat}>
                <Text style={[styles.loanStatLabel, { color: colors.textMuted }]}>Monthly EMI</Text>
                <Text style={[styles.loanStatValue, { color: '#f59e0b' }]}>{formatCurrency(summary.totalEMI)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        {summary.lastTransactions.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions' as any)} data-testid="button-view-transactions">
                <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {summary.lastTransactions.map((txn: any) => (
              <View key={txn.id} style={styles.txnRow} data-testid={`row-txn-${txn.id}`}>
                <View style={[styles.txnIcon, { backgroundColor: txn.type === 'credit' ? '#10b981' + '18' : '#ef4444' + '18' }]}>
                  <Ionicons
                    name={txn.type === 'credit' ? 'arrow-down-outline' : 'arrow-up-outline'}
                    size={16}
                    color={txn.type === 'credit' ? '#10b981' : '#ef4444'}
                  />
                </View>
                <View style={styles.txnInfo}>
                  <Text style={[styles.txnDesc, { color: colors.text }]} numberOfLines={1}>
                    {txn.description || txn.merchant || (txn.category?.name) || 'Transaction'}
                  </Text>
                  <Text style={[styles.txnDate, { color: colors.textMuted }]}>
                    {new Date(txn.transactionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {txn.account ? ` - ${txn.account.name}` : ''}
                  </Text>
                </View>
                <Text style={[styles.txnAmt, { color: txn.type === 'credit' ? '#10b981' : '#ef4444' }]}>
                  {txn.type === 'credit' ? '+' : '-'}{formatCurrency(parseFloat(txn.amount))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '12' }]}
              onPress={() => navigation.navigate('ScheduledPayments' as any)}
              data-testid="button-quick-payments"
            >
              <Ionicons name="repeat-outline" size={22} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Payments</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f59e0b' + '12' }]}
              onPress={() => navigation.navigate('Loans' as any)}
              data-testid="button-quick-loans"
            >
              <Ionicons name="card-outline" size={22} color="#f59e0b" />
              <Text style={[styles.actionText, { color: '#f59e0b' }]}>Loans</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#8b5cf6' + '12' }]}
              onPress={() => navigation.navigate('Insurances' as any)}
              data-testid="button-quick-insurance"
            >
              <Ionicons name="shield-checkmark-outline" size={22} color="#8b5cf6" />
              <Text style={[styles.actionText, { color: '#8b5cf6' }]}>Insurance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10b981' + '12' }]}
              onPress={() => navigation.navigate('SavingsGoals' as any)}
              data-testid="button-quick-savings"
            >
              <Ionicons name="trophy-outline" size={22} color="#10b981" />
              <Text style={[styles.actionText, { color: '#10b981' }]}>Savings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <FABButton onPress={() => navigation.navigate('AddTransaction')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 2,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  netLabel: {
    fontSize: 13,
  },
  netValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  netProgressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  netProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  todaySpent: {
    fontSize: 12,
    textAlign: 'right',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  categoryNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryAmt: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryPct: {
    fontSize: 12,
    fontWeight: '500',
    width: 35,
    textAlign: 'right',
  },
  budgetItem: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    borderRadius: 4,
  },
  ccRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb20',
  },
  ccInfo: {
    flex: 1,
    marginRight: 8,
  },
  ccName: {
    fontSize: 14,
    fontWeight: '500',
  },
  ccBank: {
    fontSize: 11,
    marginTop: 2,
  },
  ccRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  ccSpent: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  ccLimit: {
    fontSize: 11,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  billIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 14,
    fontWeight: '500',
  },
  billDue: {
    fontSize: 11,
    marginTop: 2,
  },
  billAmt: {
    fontSize: 14,
    fontWeight: '600',
  },
  loanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  loanStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  loanStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loanDivider: {
    width: 1,
    height: 36,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  txnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnInfo: {
    flex: 1,
  },
  txnDesc: {
    fontSize: 14,
    fontWeight: '500',
  },
  txnDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txnAmt: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
