import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { api, API_BASE_URL } from '../lib/api';
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface FinancialInsight {
  nextMonthIncome: number;
  nextMonthExpenses: number;
  scheduledPayments: number;
  creditCardBills: number;
  loanEMIs: number;
  insurancePremiums: number;
  expenseRatio: number;
  alertLevel: 'safe' | 'warning' | 'critical';
  message: string;
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { username } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'next'>('current');
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  // Fetch salary profile to get next month's income
  const { data: salaryProfile } = useQuery({
    queryKey: ['/api/salary-profile'],
    queryFn: api.getSalaryProfile,
  });

  // Fetch next salary cycle
  const { data: nextPaydays = [] } = useQuery({
    queryKey: ['/api/salary-profile/next-paydays'],
    queryFn: () => api.getNextPaydays(1),
  });

  // Fetch scheduled payments for next month
  const { data: scheduledPayments = [] } = useQuery({
    queryKey: ['/api/scheduled-payments'],
    queryFn: api.getScheduledPayments,
  });

  // Fetch loans for EMI calculation
  const { data: loans = [] } = useQuery({
    queryKey: ['/api/loans'],
    queryFn: api.getLoans,
  });

  // Fetch loan summary
  const { data: loanSummary } = useQuery({
    queryKey: ['/api/loan-summary'],
    queryFn: api.getLoanSummary,
  });

  // Fetch insurances
  const { data: insurances = [] } = useQuery({
    queryKey: ['/api/insurances'],
    queryFn: api.getInsurances,
  });

  // Fetch current dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/dashboard'],
    queryFn: api.getDashboard,
  });

  // Fetch monthly expenses for spending trend chart
  const { data: monthlyExpenses } = useQuery({
    queryKey: ['/api/monthlyExpenses'],
    queryFn: api.getMonthlyExpenses,
  });

  // Fetch monthly credit card spending for spending trend chart
  const { data: monthlyCreditCardSpending } = useQuery({
    queryKey: ['/api/monthlyCreditCardSpending'],
    queryFn: api.getMonthlyCreditCardSpending,
  });

  // Fetch previous credit card cycle spending for next month bill estimation
  // Use 'previous' cycle to get the complete cycle that represents next month's bill
  // Example: Today Jan 14, billing date 13 -> previous cycle Dec 13-Jan 12 = bill to be paid from Jan salary
  const { data: creditCardSpending = [] } = useQuery({
    queryKey: ['/api/credit-card-spending', 'previous'],
    queryFn: () => api.getCreditCardSpending('previous'),
  });

  // Calculate financial insights
  const financialInsight: FinancialInsight = useMemo(() => {
    const now = new Date();
    
    // Calculate current and next cycle based on monthCycleStartDay
    const cycleStartDay = salaryProfile?.monthCycleStartDay || 1;
    
    // Determine current cycle dates
    let currentCycleStart: Date;
    let nextCycleStart: Date;
    
    if (now.getDate() >= cycleStartDay) {
      // We're in the current month's cycle
      currentCycleStart = new Date(now.getFullYear(), now.getMonth(), cycleStartDay);
      nextCycleStart = new Date(now.getFullYear(), now.getMonth() + 1, cycleStartDay);
    } else {
      // We're still in the previous month's cycle
      currentCycleStart = new Date(now.getFullYear(), now.getMonth() - 1, cycleStartDay);
      nextCycleStart = new Date(now.getFullYear(), now.getMonth(), cycleStartDay);
    }
    
    const nextCycleEnd = new Date(nextCycleStart);
    nextCycleEnd.setMonth(nextCycleEnd.getMonth() + 1);
    nextCycleEnd.setDate(nextCycleEnd.getDate() - 1); // Last day of next cycle

    // Calculate next cycle's income from salary profile (using monthlyAmount field)
    let nextMonthIncome = 0;
    if (salaryProfile?.monthlyAmount) {
      nextMonthIncome = parseFloat(String(salaryProfile.monthlyAmount));
    }

    // Calculate scheduled payments for next cycle (all active scheduled payments except credit card bills)
    let scheduledPaymentsTotal = 0;
    
    scheduledPayments.forEach((payment: any) => {
      // Check for status === 'active' (not isActive property)
      if (payment.status === 'active' && payment.paymentType !== 'credit_card_bill') {
        const amount = parseFloat(payment.amount || '0');
        scheduledPaymentsTotal += amount;
      }
    });

    // Calculate credit card bills for next cycle from previous complete billing cycle
    // Credit cards use billing date, not cycle start date
    let creditCardBillsTotal = 0;
    creditCardSpending.forEach((card: any) => {
      if (card.totalSpent) {
        creditCardBillsTotal += parseFloat(String(card.totalSpent));
      }
    });

    // Calculate loan EMIs due next cycle (all active loans)
    let loanEMIsTotal = 0;
    loans.forEach((loan: any) => {
      if (loan.status === 'active' && loan.emiAmount) {
        loanEMIsTotal += parseFloat(loan.emiAmount);
      }
    });

    // Calculate insurance premiums due next cycle
    let insurancePremiumsTotal = 0;
    insurances.forEach((insurance: any) => {
      if (insurance.isActive && insurance.premiumAmount) {
        const premiumAmount = parseFloat(insurance.premiumAmount);
        // Check if due next cycle based on frequency
        if (insurance.paymentFrequency === 'monthly') {
          insurancePremiumsTotal += premiumAmount;
        } else if (insurance.nextDueDate) {
          const dueDate = new Date(insurance.nextDueDate);
          // Check if due date falls within next cycle
          if (dueDate >= nextCycleStart && dueDate <= nextCycleEnd) {
            insurancePremiumsTotal += premiumAmount;
          }
        }
      }
    });

    // Total next month expenses
    const nextMonthExpenses = scheduledPaymentsTotal + creditCardBillsTotal + loanEMIsTotal + insurancePremiumsTotal;

    // Calculate expense ratio
    const expenseRatio = nextMonthIncome > 0 ? (nextMonthExpenses / nextMonthIncome) * 100 : 0;

    // Determine alert level and message
    let alertLevel: 'safe' | 'warning' | 'critical' = 'safe';
    let message = '';

    if (expenseRatio > 80) {
      alertLevel = 'critical';
      message = '⚠️ Critical: Your planned expenses exceed 80% of your income! Consider reducing discretionary spending.';
    } else if (expenseRatio > 60) {
      alertLevel = 'warning';
      message = '⚡ Warning: Your expenses are above 60% of income. Monitor your spending closely to maintain financial health.';
    } else {
      alertLevel = 'safe';
      message = '✅ Great! Your expenses are under control. Keep maintaining good financial habits.';
    }

    return {
      nextMonthIncome,
      nextMonthExpenses,
      scheduledPayments: scheduledPaymentsTotal,
      creditCardBills: creditCardBillsTotal,
      loanEMIs: loanEMIsTotal,
      insurancePremiums: insurancePremiumsTotal,
      expenseRatio,
      alertLevel,
      message,
    };
  }, [salaryProfile, scheduledPayments, loans, insurances, creditCardSpending]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['/api/dashboard'] }),
      queryClient.refetchQueries({ queryKey: ['/api/salary-profile'] }),
      queryClient.refetchQueries({ queryKey: ['/api/salary-profile/next-paydays'] }),
      queryClient.refetchQueries({ queryKey: ['/api/scheduled-payments'] }),
      queryClient.refetchQueries({ queryKey: ['/api/loans'] }),
      queryClient.refetchQueries({ queryKey: ['/api/loan-summary'] }),
      queryClient.refetchQueries({ queryKey: ['/api/insurances'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading your financial insights...</Text>
        </View>
      </View>
    );
  }

  const getAlertColor = (level: string) => {
    if (level === 'critical') return '#ef4444';
    if (level === 'warning') return '#f59e0b';
    return '#10b981';
  };

  // Calculate next cycle start date based on monthCycleStartDay
  const cycleStartDay = salaryProfile?.monthCycleStartDay || 1;
  const now = new Date();
  const nextCycleDate = new Date();
  
  if (now.getDate() >= cycleStartDay) {
    // Next cycle is in next calendar month
    nextCycleDate.setMonth(now.getMonth() + 1);
  }
  nextCycleDate.setDate(cycleStartDay);
  
  const nextCycleName = MONTH_NAMES[nextCycleDate.getMonth()];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Welcome back,</Text>
            <Text style={[styles.username, { color: colors.text }]}>{username || 'User'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Financial Assistant Title */}
        <View style={styles.assistantHeader}>
          <Ionicons name="analytics" size={28} color={colors.primary} />
          <Text style={[styles.assistantTitle, { color: colors.text }]}>Your Financial Assistant</Text>
        </View>

        {/* Alert Message */}
        <View style={[styles.alertCard, { backgroundColor: getAlertColor(financialInsight.alertLevel) + '15', borderColor: getAlertColor(financialInsight.alertLevel) }]}>
          <Text style={[styles.alertMessage, { color: getAlertColor(financialInsight.alertLevel) }]}>
            {financialInsight.message}
          </Text>
        </View>

        {/* Tabs for Current Cycle / Next Cycle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'current' && styles.activeTab, { borderBottomColor: activeTab === 'current' ? colors.primary : 'transparent' }]}
            onPress={() => setActiveTab('current')}
          >
            <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText, { color: activeTab === 'current' ? colors.primary : colors.textMuted }]}>
              Current Cycle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'next' && styles.activeTab, { borderBottomColor: activeTab === 'next' ? colors.primary : 'transparent' }]}
            onPress={() => setActiveTab('next')}
          >
            <Text style={[styles.tabText, activeTab === 'next' && styles.activeTabText, { color: activeTab === 'next' ? colors.primary : colors.textMuted }]}>
              Next Cycle
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current Cycle Tab Content */}
        {activeTab === 'current' && (
          <>
            {/* Spending Trend Chart */}
            {((monthlyExpenses && monthlyExpenses.length > 0) || (monthlyCreditCardSpending && monthlyCreditCardSpending.length > 0)) && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Spending Trend</Text>
                  <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                </View>
                
                <View style={styles.legendContainer}>
                  {monthlyExpenses && monthlyExpenses.length > 0 && (
                    <TouchableOpacity 
                      style={styles.legendItem}
                      onPress={() => navigation.navigate('ExpenseDetails')}
                    >
                      <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                      <Text style={[styles.legendText, { color: colors.text }]}>Expenses</Text>
                      <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                  {monthlyCreditCardSpending && monthlyCreditCardSpending.length > 0 && (
                    <TouchableOpacity 
                      style={styles.legendItem}
                      onPress={() => navigation.navigate('CreditCardDetails')}
                    >
                      <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                      <Text style={[styles.legendText, { color: colors.text }]}>Credit Card</Text>
                      <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <LineChart
                  data={{
                    labels: (monthlyExpenses && monthlyExpenses.length > 0 
                      ? monthlyExpenses 
                      : monthlyCreditCardSpending || []
                    ).map(m => m.month),
                    datasets: [
                      ...(monthlyExpenses && monthlyExpenses.length > 0 ? [{
                        data: monthlyExpenses.map(m => m.expenses || 0),
                        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                        strokeWidth: 2,
                      }] : []),
                      ...(monthlyCreditCardSpending && monthlyCreditCardSpending.length > 0 ? [{
                        data: monthlyCreditCardSpending.map(m => m.spending || 0),
                        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                        strokeWidth: 2,
                      }] : [])
                    ],
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
            )}

            {/* Credit Card Spending */}
            {dashboardData?.creditCardSpending && dashboardData.creditCardSpending.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Credit Card Spending</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
                    <Text style={[styles.viewAll, { color: colors.primary }]}>Manage</Text>
                  </TouchableOpacity>
                </View>
                
                {dashboardData.creditCardSpending.map((card) => {
                  const hasLimit = card.limit !== null && card.limit > 0;
                  const isOverLimit = hasLimit && card.percentage > 100;
                  const isNearLimit = hasLimit && card.percentage >= 70 && card.percentage <= 100;
                  
                  return (
                    <View key={card.accountId} style={styles.creditCardItem}>
                      <View style={styles.creditCardHeader}>
                        <View style={styles.creditCardInfo}>
                          <Text style={[styles.creditCardName, { color: colors.text }]}>{card.accountName}</Text>
                          {card.bankName && (
                            <Text style={[styles.creditCardBank, { color: colors.textMuted }]}>{card.bankName}</Text>
                          )}
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

            {/* Budget Tracking */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Budget Tracking</Text>
                <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
              </View>
              
              {dashboardData?.budgetUsage && dashboardData.budgetUsage.length > 0 ? (
                dashboardData.budgetUsage.slice(0, 3).map((budget) => (
                  <View key={budget.categoryId} style={styles.budgetItem}>
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
                ))
              ) : (
                <TouchableOpacity 
                  style={styles.emptyCard}
                  onPress={() => navigation.navigate('More')}
                >
                  <Ionicons name="pie-chart-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No budgets set</Text>
                  <Text style={[styles.emptySubtext, { color: colors.primary }]}>Tap to add a budget</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Next Cycle Tab Content */}
        {activeTab === 'next' && (
          <>
            {/* Next Cycle Overview */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Next Cycle ({nextCycleName} {nextCycleDate.getDate()}) Overview</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              </View>

              <View style={styles.overviewGrid}>
                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Expected Income</Text>
                  <Text style={[styles.incomeAmount, { color: '#10b981' }]}>
                    {formatCurrency(financialInsight.nextMonthIncome)}
                  </Text>
                </View>

                <View style={styles.overviewItem}>
                  <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Planned Expenses</Text>
                  <Text style={[styles.expenseAmount, { color: '#ef4444' }]}>
                    {formatCurrency(financialInsight.nextMonthExpenses)}
                  </Text>
                </View>
              </View>

              {/* Expense Ratio Progress */}
              <View style={styles.ratioContainer}>
                <View style={styles.ratioHeader}>
                  <Text style={[styles.ratioLabel, { color: colors.textMuted }]}>Expense Ratio</Text>
                  <Text style={[styles.ratioValue, { color: getAlertColor(financialInsight.alertLevel) }]}>
                    {financialInsight.expenseRatio.toFixed(1)}%
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(financialInsight.expenseRatio, 100)}%`,
                        backgroundColor: getAlertColor(financialInsight.alertLevel),
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressMarkers}>
                  <View style={styles.marker}>
                    <View style={[styles.markerLine, { left: '60%' }]} />
                    <Text style={[styles.markerText, { color: colors.textMuted, left: '60%' }]}>60%</Text>
                  </View>
                  <View style={styles.marker}>
                    <View style={[styles.markerLine, { left: '80%' }]} />
                    <Text style={[styles.markerText, { color: colors.textMuted, left: '80%' }]}>80%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Expense Breakdown */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Expense Breakdown</Text>
                <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
              </View>

              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: '#3b82f6' + '20' }]}>
                    <Ionicons name="repeat-outline" size={18} color="#3b82f6" />
                  </View>
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Scheduled Payments</Text>
                </View>
                <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                  {formatCurrency(financialInsight.scheduledPayments)}
                </Text>
              </View>

              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: '#ec4899' + '20' }]}>
                    <Ionicons name="card" size={18} color="#ec4899" />
                  </View>
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Credit Card Bills</Text>
                </View>
                <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                  {formatCurrency(financialInsight.creditCardBills)}
                </Text>
              </View>

              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: '#f59e0b' + '20' }]}>
                    <Ionicons name="cash-outline" size={18} color="#f59e0b" />
                  </View>
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Loan EMIs</Text>
                </View>
                <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                  {formatCurrency(financialInsight.loanEMIs)}
                </Text>
              </View>

              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#8b5cf6" />
                  </View>
                  <Text style={[styles.breakdownLabel, { color: colors.text }]}>Insurance Premiums</Text>
                </View>
                <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                  {formatCurrency(financialInsight.insurancePremiums)}
                </Text>
              </View>

              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.totalAmount, { color: '#ef4444' }]}>
                  {formatCurrency(financialInsight.nextMonthExpenses)}
                </Text>
              </View>
            </View>

            {/* Quick Action Tiles */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 16 }]}>Quick Actions</Text>
              
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => navigation.navigate('ScheduledPayments' as any)}
                >
                  <Ionicons name="repeat-outline" size={24} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Payments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#f59e0b' + '15' }]}
                  onPress={() => navigation.navigate('Loans' as any)}
                >
                  <Ionicons name="card-outline" size={24} color="#f59e0b" />
                  <Text style={[styles.actionText, { color: '#f59e0b' }]}>Loans</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#8b5cf6' + '15' }]}
                  onPress={() => navigation.navigate('Insurances' as any)}
                >
                  <Ionicons name="shield-checkmark-outline" size={24} color="#8b5cf6" />
                  <Text style={[styles.actionText, { color: '#8b5cf6' }]}>Insurance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10b981' + '15' }]}
                  onPress={() => navigation.navigate('SavingsGoals' as any)}
                >
                  <Ionicons name="trophy-outline" size={24} color="#10b981" />
                  <Text style={[styles.actionText, { color: '#10b981' }]}>Savings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

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
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  assistantTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  alertMessage: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  overviewItem: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  incomeAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  expenseAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  ratioContainer: {
    marginTop: 8,
  },
  ratioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratioLabel: {
    fontSize: 14,
  },
  ratioValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressMarkers: {
    position: 'relative',
    height: 30,
    marginTop: 4,
  },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  markerLine: {
    position: 'absolute',
    width: 1,
    height: 8,
    backgroundColor: '#9ca3af',
    top: 0,
  },
  markerText: {
    position: 'absolute',
    fontSize: 11,
    top: 12,
    transform: [{ translateX: -10 }],
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 15,
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
  },
  creditCardItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  creditCardInfo: {
    flex: 1,
  },
  creditCardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  creditCardBank: {
    fontSize: 13,
  },
  creditCardAmounts: {
    alignItems: 'flex-end',
  },
  creditCardSpent: {
    fontSize: 18,
    fontWeight: 'bold',
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
    width: 45,
    textAlign: 'right',
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetName: {
    fontSize: 15,
    fontWeight: '600',
  },
  budgetAmount: {
    fontSize: 13,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
});
