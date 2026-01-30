import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface PaymentItem {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  type: 'scheduled' | 'emi' | 'insurance' | 'credit_card';
  status: 'pending' | 'paid' | 'overdue';
  category?: string;
}

interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  previousAmount?: number;
}

export default function DashboardScreenV2() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { username } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  const now = new Date();
  const currentMonth = MONTH_NAMES[now.getMonth()];
  const nextMonth = MONTH_NAMES[(now.getMonth() + 1) % 12];

  // Fetch salary profile
  const { data: salaryProfile } = useQuery({
    queryKey: ['/api/salary-profile'],
    queryFn: api.getSalaryProfile,
  });

  // Fetch scheduled payments
  const { data: scheduledPayments = [] } = useQuery({
    queryKey: ['/api/scheduled-payments'],
    queryFn: api.getScheduledPayments,
  });

  // Fetch loans
  const { data: loans = [] } = useQuery({
    queryKey: ['/api/loans'],
    queryFn: api.getLoans,
  });

  // Fetch insurances
  const { data: insurances = [] } = useQuery({
    queryKey: ['/api/insurances'],
    queryFn: api.getInsurances,
  });

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/dashboard'],
    queryFn: api.getDashboard,
  });

  // Fetch accounts for credit card info
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: api.getAccounts,
  });

  // Fetch credit card spending
  const { data: creditCardSpending = [] } = useQuery({
    queryKey: ['/api/credit-card-spending', 'current'],
    queryFn: () => api.getCreditCardSpending('current'),
  });

  // Fetch previous month credit card spending for comparison
  const { data: prevCreditCardSpending = [] } = useQuery({
    queryKey: ['/api/credit-card-spending', 'previous'],
    queryFn: () => api.getCreditCardSpending('previous'),
  });

  // Fetch monthly expenses for spending trend chart
  const { data: monthlyExpenses } = useQuery({
    queryKey: ['/api/monthlyExpenses'],
    queryFn: api.getMonthlyExpenses,
  });

  // Fetch monthly credit card spending for trend chart
  const { data: monthlyCreditCardSpending } = useQuery({
    queryKey: ['/api/monthlyCreditCardSpending'],
    queryFn: api.getMonthlyCreditCardSpending,
  });

  // Calculate cycle dates
  const cycleStartDay = salaryProfile?.monthCycleStartDay || 1;
  const cycleStart = useMemo(() => {
    if (now.getDate() >= cycleStartDay) {
      return new Date(now.getFullYear(), now.getMonth(), cycleStartDay);
    }
    return new Date(now.getFullYear(), now.getMonth() - 1, cycleStartDay);
  }, [cycleStartDay, now]);

  const cycleEnd = useMemo(() => {
    const end = new Date(cycleStart);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
    return end;
  }, [cycleStart]);

  // Days remaining in current cycle
  const daysRemaining = useMemo(() => {
    const diffTime = cycleEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [cycleEnd, now]);

  // Calculate monthly income
  const monthlyIncome = useMemo(() => {
    return salaryProfile?.monthlyAmount ? parseFloat(String(salaryProfile.monthlyAmount)) : 0;
  }, [salaryProfile]);

  // Calculate current month spending from dashboard data
  const currentMonthSpending = useMemo(() => {
    return dashboardData?.totalSpentMonth || 0;
  }, [dashboardData]);

  // Build payment list for current cycle
  const paymentsList = useMemo((): PaymentItem[] => {
    const payments: PaymentItem[] = [];

    // Add scheduled payments - dueDate is a day number (1-31)
    scheduledPayments.forEach((payment: any) => {
      if (payment.status !== 'active') return;
      
      // dueDate is the day of month (number), not a Date object
      const dueDay = typeof payment.dueDate === 'number' ? payment.dueDate : 1;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      
      // Determine status based on whether due day has passed this month
      const isPastDue = now.getDate() > dueDay;
      
      payments.push({
        id: payment.id,
        name: payment.name,
        amount: parseFloat(payment.amount || '0'),
        dueDate,
        type: payment.paymentType === 'credit_card_bill' ? 'credit_card' : 'scheduled',
        status: isPastDue ? 'overdue' : 'pending',
        category: payment.category?.name,
      });
    });

    // Add loan EMIs - emiDay is a day number (1-31)
    loans.forEach((loan: any) => {
      if (loan.status !== 'active') return;
      
      // emiDay is the day of month (number)
      const dueDay = typeof loan.emiDay === 'number' ? loan.emiDay : 5;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      
      const isPastDue = now.getDate() > dueDay;
      
      payments.push({
        id: loan.id,
        name: `${loan.name} EMI`,
        amount: parseFloat(loan.emiAmount || '0'),
        dueDate,
        type: 'emi',
        status: isPastDue ? 'overdue' : 'pending',
      });
    });

    // Add insurance premiums due this month
    insurances.forEach((insurance: any) => {
      if (insurance.status !== 'active') return;
      
      if (insurance.nextDueDate) {
        const dueDate = new Date(insurance.nextDueDate);
        if (dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()) {
          const isPastDue = now > dueDate;
          payments.push({
            id: insurance.id,
            name: `${insurance.name} Premium`,
            amount: parseFloat(insurance.premiumAmount || '0'),
            dueDate,
            type: 'insurance',
            status: isPastDue ? 'overdue' : 'pending',
          });
        }
      }
    });

    return payments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [scheduledPayments, loans, insurances, now]);

  // Separate pending and overdue payments
  const pendingPayments = useMemo(() => {
    return paymentsList.filter(p => p.status === 'pending');
  }, [paymentsList]);

  const overduePayments = useMemo(() => {
    return paymentsList.filter(p => p.status === 'overdue');
  }, [paymentsList]);

  // Calculate totals
  const totalPendingAmount = useMemo(() => {
    return pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [pendingPayments]);

  const totalOverdueAmount = useMemo(() => {
    return overduePayments.reduce((sum, p) => sum + p.amount, 0);
  }, [overduePayments]);

  // Credit card bills this month
  const creditCardBillsDue = useMemo(() => {
    let total = 0;
    creditCardSpending.forEach((card: any) => {
      if (card.totalSpent) {
        total += parseFloat(String(card.totalSpent));
      }
    });
    return total;
  }, [creditCardSpending]);

  // Calculate remaining budget - include credit card bills due this cycle
  const remainingBudget = useMemo(() => {
    return monthlyIncome - currentMonthSpending - totalPendingAmount - creditCardBillsDue;
  }, [monthlyIncome, currentMonthSpending, totalPendingAmount, creditCardBillsDue]);

  // Daily budget suggestion
  const dailyBudget = useMemo(() => {
    if (daysRemaining <= 0) return 0;
    return Math.max(0, remainingBudget / daysRemaining);
  }, [remainingBudget, daysRemaining]);

  // Spending by category for insights
  const categorySpending = useMemo((): SpendingCategory[] => {
    if (!dashboardData?.monthlyExpensesByCategory) return [];
    
    const total = dashboardData.monthlyExpensesByCategory.reduce((sum: number, cat) => 
      sum + cat.total, 0);
    
    return dashboardData.monthlyExpensesByCategory
      .map((cat) => ({
        name: cat.categoryName,
        amount: cat.total,
        percentage: total > 0 ? (cat.total / total) * 100 : 0,
        trend: 'stable' as const,
      }))
      .sort((a: SpendingCategory, b: SpendingCategory) => b.amount - a.amount)
      .slice(0, 5);
  }, [dashboardData]);

  // Financial health score (0-100)
  const healthScore = useMemo(() => {
    if (monthlyIncome <= 0) return 50;
    
    // Include credit card bills in total spending calculation
    const totalCommitted = currentMonthSpending + totalPendingAmount + creditCardBillsDue;
    const spendingRatio = totalCommitted / monthlyIncome;
    const overdueRatio = totalOverdueAmount / monthlyIncome;
    
    let score = 100;
    score -= spendingRatio * 50; // Up to 50 points for spending
    score -= overdueRatio * 30; // Up to 30 points for overdue
    score -= overduePayments.length * 5; // 5 points per overdue item
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [monthlyIncome, currentMonthSpending, totalPendingAmount, creditCardBillsDue, totalOverdueAmount, overduePayments]);

  const getHealthColor = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 70) return 'Healthy';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['/api/dashboard'] }),
      queryClient.refetchQueries({ queryKey: ['/api/salary-profile'] }),
      queryClient.refetchQueries({ queryKey: ['/api/scheduled-payments'] }),
      queryClient.refetchQueries({ queryKey: ['/api/loans'] }),
      queryClient.refetchQueries({ queryKey: ['/api/insurances'] }),
      queryClient.refetchQueries({ queryKey: ['/api/accounts'] }),
      queryClient.refetchQueries({ queryKey: ['/api/credit-card-spending'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'emi': return 'cash-outline';
      case 'insurance': return 'shield-checkmark-outline';
      case 'credit_card': return 'card-outline';
      default: return 'repeat-outline';
    }
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case 'emi': return '#f59e0b';
      case 'insurance': return '#8b5cf6';
      case 'credit_card': return '#ec4899';
      default: return '#3b82f6';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading your finances...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header with Financial Health */}
        <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {username || 'User'}</Text>
              <Text style={styles.headerDate}>{currentMonth} {now.getFullYear()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Financial Health Score */}
          <View style={styles.healthContainer}>
            <View style={styles.healthScoreCircle}>
              <Text style={styles.healthScore}>{healthScore}</Text>
              <Text style={styles.healthScoreLabel}>Score</Text>
            </View>
            <View style={styles.healthInfo}>
              <Text style={[styles.healthStatus, { color: getHealthColor(healthScore) }]}>
                {getHealthLabel(healthScore)}
              </Text>
              <Text style={styles.healthMessage}>
                {daysRemaining} days left in cycle
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="wallet-outline" size={20} color="#10b981" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Income</Text>
            <Text style={[styles.summaryAmount, { color: '#10b981' }]}>
              {formatCurrency(monthlyIncome)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#ef444420' }]}>
              <Ionicons name="trending-down-outline" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Spent</Text>
            <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
              {formatCurrency(currentMonthSpending)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="time-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Bills Due</Text>
            <Text style={[styles.summaryAmount, { color: '#3b82f6' }]}>
              {formatCurrency(totalPendingAmount + creditCardBillsDue)}
            </Text>
          </View>
        </View>

        {/* Remaining Budget Card */}
        <View style={[styles.budgetCard, { 
          backgroundColor: remainingBudget >= 0 ? '#10b98115' : '#ef444415',
          borderColor: remainingBudget >= 0 ? '#10b981' : '#ef4444'
        }]}>
          <View style={styles.budgetCardContent}>
            <View>
              <Text style={[styles.budgetCardLabel, { color: colors.textMuted }]}>
                Available to Spend
              </Text>
              <Text style={[styles.budgetCardAmount, { 
                color: remainingBudget >= 0 ? '#10b981' : '#ef4444' 
              }]}>
                {formatCurrency(Math.abs(remainingBudget))}
                {remainingBudget < 0 && ' over budget'}
              </Text>
            </View>
            <View style={styles.dailyBudgetBox}>
              <Text style={[styles.dailyBudgetLabel, { color: colors.textMuted }]}>
                Daily Budget
              </Text>
              <Text style={[styles.dailyBudgetAmount, { color: colors.text }]}>
                {formatCurrency(dailyBudget)}
              </Text>
            </View>
          </View>
        </View>

        {/* Overdue Payments Alert */}
        {overduePayments.length > 0 && (
          <View style={[styles.alertCard, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}>
            <View style={styles.alertHeader}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
              <Text style={[styles.alertTitle, { color: '#ef4444' }]}>
                Overdue Payments ({overduePayments.length})
              </Text>
            </View>
            <Text style={[styles.alertAmount, { color: '#ef4444' }]}>
              {formatCurrency(totalOverdueAmount)} needs immediate attention
            </Text>
            {overduePayments.slice(0, 2).map((payment) => (
              <View key={`overdue-${payment.id}`} style={styles.alertItem}>
                <Text style={[styles.alertItemName, { color: colors.text }]}>{payment.name}</Text>
                <Text style={[styles.alertItemAmount, { color: '#ef4444' }]}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Payments Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Upcoming This Month
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('ScheduledPayments' as any)}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {pendingPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#10b981" />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                All payments are up to date!
              </Text>
            </View>
          ) : (
            pendingPayments.slice(0, 5).map((payment) => (
              <View key={`pending-${payment.id}-${payment.type}`} style={styles.paymentItem}>
                <View style={[styles.paymentIcon, { backgroundColor: getPaymentTypeColor(payment.type) + '20' }]}>
                  <Ionicons 
                    name={getPaymentTypeIcon(payment.type) as any} 
                    size={18} 
                    color={getPaymentTypeColor(payment.type)} 
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={[styles.paymentName, { color: colors.text }]}>
                    {payment.name}
                  </Text>
                  <Text style={[styles.paymentDue, { color: colors.textMuted }]}>
                    Due {payment.dueDate.getDate()} {SHORT_MONTHS[payment.dueDate.getMonth()]}
                  </Text>
                </View>
                <Text style={[styles.paymentAmount, { color: colors.text }]}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Spending Insights */}
        {categorySpending.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Where You're Spending
              </Text>
              <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
            </View>

            {categorySpending.map((category, index) => (
              <View key={category.name} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.categoryRank, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.categoryRankText, { color: colors.primary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.categoryDetails}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>
                      {category.name}
                    </Text>
                    <View style={[styles.categoryBar, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.categoryBarFill, 
                          { 
                            width: `${Math.min(category.percentage, 100)}%`,
                            backgroundColor: colors.primary 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.categoryAmounts}>
                  <Text style={[styles.categoryAmount, { color: colors.text }]}>
                    {formatCurrency(category.amount)}
                  </Text>
                  <Text style={[styles.categoryPercent, { color: colors.textMuted }]}>
                    {category.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}

            {/* Spending Tip */}
            {categorySpending.length > 0 && categorySpending[0].percentage > 30 && (
              <View style={[styles.tipCard, { backgroundColor: '#f59e0b15' }]}>
                <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
                <Text style={[styles.tipText, { color: '#f59e0b' }]}>
                  Tip: {categorySpending[0].name} is {categorySpending[0].percentage.toFixed(0)}% of your spending. 
                  Consider setting a budget limit.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Spending Trend Chart */}
        {((monthlyExpenses && monthlyExpenses.length > 0) || (monthlyCreditCardSpending && monthlyCreditCardSpending.length > 0)) && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Trend</Text>
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
                ).map((m: any) => m.month),
                datasets: [
                  ...(monthlyExpenses && monthlyExpenses.length > 0 ? [{
                    data: monthlyExpenses.map((m: any) => m.expenses || 0),
                    color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
                    strokeWidth: 2,
                  }] : []),
                  ...(monthlyCreditCardSpending && monthlyCreditCardSpending.length > 0 ? [{
                    data: monthlyCreditCardSpending.map((m: any) => m.spending || 0),
                    color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                    strokeWidth: 2,
                  }] : [])
                ],
              }}
              width={Dimensions.get('window').width - 64}
              height={200}
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
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Credit Card Usage</Text>
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
                  <View style={styles.creditCardRow}>
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
        {dashboardData?.budgetUsage && dashboardData.budgetUsage.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Tracking</Text>
              <TouchableOpacity onPress={() => navigation.navigate('More')}>
                <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {dashboardData.budgetUsage.slice(0, 3).map((budget) => (
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
            ))}
          </View>
        )}

        {/* Next Month Preview */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Plan for {nextMonth}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>

          <View style={styles.nextMonthGrid}>
            <View style={styles.nextMonthItem}>
              <Text style={[styles.nextMonthLabel, { color: colors.textMuted }]}>
                Expected Income
              </Text>
              <Text style={[styles.nextMonthAmount, { color: '#10b981' }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>

            <View style={styles.nextMonthItem}>
              <Text style={[styles.nextMonthLabel, { color: colors.textMuted }]}>
                Fixed Expenses
              </Text>
              <Text style={[styles.nextMonthAmount, { color: '#ef4444' }]}>
                {formatCurrency(totalPendingAmount + creditCardBillsDue)}
              </Text>
            </View>
          </View>

          <View style={[styles.nextMonthSavings, { borderTopColor: colors.border }]}>
            <Text style={[styles.nextMonthLabel, { color: colors.textMuted }]}>
              Estimated Savings Potential
            </Text>
            <Text style={[styles.savingsAmount, { 
              color: (monthlyIncome - totalPendingAmount - creditCardBillsDue) > 0 ? '#10b981' : '#ef4444' 
            }]}>
              {formatCurrency(Math.max(0, monthlyIncome - totalPendingAmount - creditCardBillsDue))}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
            Quick Actions
          </Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => navigation.navigate('AddTransaction')}
            >
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10b98115' }]}
              onPress={() => navigation.navigate('SavingsGoals' as any)}
            >
              <Ionicons name="trophy-outline" size={24} color="#10b981" />
              <Text style={[styles.actionText, { color: '#10b981' }]}>Savings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f59e0b15' }]}
              onPress={() => navigation.navigate('Loans' as any)}
            >
              <Ionicons name="cash-outline" size={24} color="#f59e0b" />
              <Text style={[styles.actionText, { color: '#f59e0b' }]}>Loans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#8b5cf615' }]}
              onPress={() => navigation.navigate('More')}
            >
              <Ionicons name="grid-outline" size={24} color="#8b5cf6" />
              <Text style={[styles.actionText, { color: '#8b5cf6' }]}>More</Text>
            </TouchableOpacity>
          </View>
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
  headerCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  healthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  healthScoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  healthScoreLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  healthInfo: {
    flex: 1,
  },
  healthStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  healthMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  budgetCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  budgetCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetCardLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  budgetCardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dailyBudgetBox: {
    alignItems: 'flex-end',
  },
  dailyBudgetLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  dailyBudgetAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  alertCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertAmount: {
    fontSize: 14,
    marginBottom: 12,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  alertItemName: {
    fontSize: 14,
  },
  alertItemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb20',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  paymentDue: {
    fontSize: 13,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  categoryRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    marginBottom: 4,
  },
  categoryBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAmounts: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryPercent: {
    fontSize: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  nextMonthGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nextMonthItem: {
    flex: 1,
  },
  nextMonthLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  nextMonthAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  nextMonthSavings: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  savingsAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 6,
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
    borderBottomColor: '#e5e7eb20',
  },
  creditCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  creditCardInfo: {
    flex: 1,
  },
  creditCardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  creditCardBank: {
    fontSize: 12,
  },
  creditCardAmounts: {
    alignItems: 'flex-end',
  },
  creditCardSpent: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditCardLimit: {
    fontSize: 11,
    marginTop: 2,
  },
  creditCardProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    width: 42,
    textAlign: 'right',
  },
  budgetItem: {
    marginBottom: 14,
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
});
