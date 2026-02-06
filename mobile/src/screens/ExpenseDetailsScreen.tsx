import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Switch } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;

export default function ExpenseDetailsScreen() {
  const navigation = useNavigation();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showIncome, setShowIncome] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null); // null = "All"

  const { data: accounts } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: api.getAccounts,
  });

  const { data: transactions } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: api.getTransactions,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['categoryBreakdown', selectedMonth, selectedYear, showIncome],
    queryFn: () => api.getCategoryBreakdown(selectedMonth, selectedYear),
  });

  // Filter to get only bank/savings accounts (not credit cards)
  const bankAccounts = useMemo(() => {
    return accounts?.filter(acc => 
      acc.type !== 'credit_card' && acc.isActive
    ) || [];
  }, [accounts]);

  // Category breakdown for specific account
  const accountCategoryBreakdown = useMemo(() => {
    if (!transactions || !selectedAccountId) return null;

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const categoryMap = new Map<string, { total: number; count: number; color: string; categoryId: number; type: 'income' | 'expense' }>();

    transactions.forEach(t => {
      const transactionDate = new Date(t.transactionDate);
      if (
        t.accountId === selectedAccountId &&
        transactionDate >= startOfMonth &&
        transactionDate <= endOfMonth &&
        t.category
      ) {
        const isIncome = t.type === 'credit';
        if (!showIncome && isIncome) return; // Skip income if toggle is off

        const key = t.category.name;
        const existing = categoryMap.get(key) || { 
          total: 0, 
          count: 0, 
          color: t.category.color || colors.primary, 
          categoryId: t.category.id,
          type: isIncome ? 'income' : 'expense'
        };
        categoryMap.set(key, {
          ...existing,
          total: existing.total + parseFloat(t.amount),
          count: existing.count + 1,
        });
      }
    });

    const breakdown = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        categoryName: name,
        categoryId: data.categoryId,
        total: data.total,
        transactionCount: data.count,
        color: data.color,
        type: data.type,
      }))
      .sort((a, b) => b.total - a.total);

    const totalExpenses = breakdown
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + item.total, 0);
    const totalIncome = breakdown
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + item.total, 0);

    return { breakdown, totalExpenses, totalIncome };
  }, [transactions, selectedAccountId, selectedMonth, selectedYear, showIncome, colors]);

  const selectedAccount = selectedAccountId 
    ? bankAccounts.find(acc => acc.id === selectedAccountId)
    : null;

  // Determine what data to display
  const displayData = selectedAccountId && accountCategoryBreakdown
    ? accountCategoryBreakdown
    : { 
        breakdown: (data?.breakdown || []).map(item => ({ ...item, type: 'expense' as const })), 
        totalExpenses: data?.totalExpenses || 0,
        totalIncome: 0
      };

  // Category icon mapping (using Ionicons names)
  const getCategoryIcon = (categoryName: string): string => {
    const iconMap: { [key: string]: string } = {
      'Groceries': 'cart',
      'Transport': 'car',
      'Dining': 'restaurant',
      'Shopping': 'bag-handle',
      'Entertainment': 'game-controller',
      'Bills': 'receipt',
      'Health': 'medical',
      'Education': 'school',
      'Travel': 'airplane',
      'Salary': 'briefcase',
      'Investment': 'trending-up',
      'Transfer': 'repeat',
      'Other': 'ellipsis-horizontal',
      // Additional common categories
      'Food': 'fast-food',
      'Rent': 'home',
      'Utilities': 'flash',
      'Personal': 'person',
      'Insurance': 'shield-checkmark',
      'EMI': 'card',
    };
    return iconMap[categoryName] || 'pricetag';
  };

  // Map invalid icon names to valid Ionicons
  const getValidIconName = (iconName: string): string => {
    const iconMap: { [key: string]: string } = {
      'shopping-bag': 'bag-handle',
      'shopping-cart': 'cart-outline',
    };
    return iconMap[iconName] || iconName || 'ellipsis-horizontal';
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date();
    const isCurrentMonth = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();
    
    if (isCurrentMonth) {
      return; // Don't allow going to future months
    }
    
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* FIRST HALF - Month selector and category list */}
        <View style={styles.firstHalf}>
          {/* Month Navigation with Total */}
          <View style={[styles.monthCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
                <Ionicons name="chevron-back-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
              
              <View style={styles.monthInfo}>
                <Text style={[styles.monthText, { color: colors.text }]}>
                  {monthNames[selectedMonth].toUpperCase()} '{String(selectedYear).slice(-2)}
                </Text>
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalAmount, { color: '#ef4444' }]}>
                    ₹{displayData.totalExpenses.toFixed(0)}
                  </Text>
                  {showIncome && displayData.totalIncome > 0 && (
                    <Text style={[styles.totalAmount, { color: colors.success, marginLeft: 16 }]}>
                      (₹{displayData.totalIncome.toFixed(0)})
                    </Text>
                  )}
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={handleNextMonth} 
                style={styles.navButton}
                disabled={isCurrentMonth}
              >
                <Ionicons 
                  name="chevron-forward-outline" 
                  size={28} 
                  color={isCurrentMonth ? colors.textMuted : colors.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Account Filter Chips */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}
            contentContainerStyle={styles.chipContent}
          >
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: selectedAccountId === null ? colors.primary : colors.card },
                selectedAccountId === null && styles.chipSelected
              ]}
              onPress={() => setSelectedAccountId(null)}
            >
              <Text style={[
                styles.chipText,
                { color: selectedAccountId === null ? '#fff' : colors.text }
              ]}>
                All
              </Text>
            </TouchableOpacity>
            
            {bankAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.chip,
                  { backgroundColor: selectedAccountId === account.id ? colors.primary : colors.card },
                  selectedAccountId === account.id && styles.chipSelected
                ]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <View style={[styles.chipDot, { backgroundColor: account.color || colors.primary }]} />
                <Text style={[
                  styles.chipText,
                  { color: selectedAccountId === account.id ? '#fff' : colors.text }
                ]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Category-wise expense list */}
          <View style={styles.categorySection}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading expenses...</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Failed to load expense details</Text>
              </View>
            ) : displayData.breakdown && displayData.breakdown.length > 0 ? (
              displayData.breakdown.map((item) => (
                <TouchableOpacity 
                  key={item.categoryId} 
                  style={[styles.categoryCard, { backgroundColor: colors.card }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryLeft}>
                      <LinearGradient
                        colors={[item.color + 'CC', item.color]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconContainer}
                      >
                        <Ionicons name={getCategoryIcon(item.categoryName) as any} size={24} color="#fff" />
                      </LinearGradient>
                      <View>
                        <Text style={[styles.categoryName, { color: colors.text }]}>
                          {item.categoryName}
                        </Text>
                        <Text style={[styles.transactionCount, { color: colors.textMuted }]}>
                          {item.transactionCount} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
                          {item.type && selectedAccountId && (
                            <Text style={{ color: item.type === 'income' ? colors.success : '#ef4444' }}>
                              {' • '}{item.type}
                            </Text>
                          )}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.categoryAmount, 
                      { 
                        color: item.type === 'income' && selectedAccountId 
                          ? colors.success 
                          : colors.text 
                      }
                    ]}>
                      ₹{item.total.toFixed(0)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="pie-chart-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No expenses this month
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* SECOND HALF - Toggle and Chart */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.secondHalf}
        >
          {/* Toggle for showing income */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleButton}>
              <Ionicons name="pulse" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.toggleLabel}>Show Income</Text>
            </View>
            <Switch
              value={showIncome}
              onValueChange={setShowIncome}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
              thumbColor={showIncome ? '#fff' : '#f4f3f4'}
              ios_backgroundColor="rgba(255,255,255,0.3)"
            />
          </View>

          {/* Chart Section */}
          <Text style={styles.chartTitle}>MONTHLY EXPENSES ( Rs )</Text>
          
          {!isLoading && displayData.breakdown && displayData.breakdown.length > 0 ? (
            <LineChart
              data={{
                labels: displayData.breakdown.slice(0, 6).map((item, idx) => {
                  const monthAbbr = monthNames[(selectedMonth - 5 + idx + 12) % 12];
                  return monthAbbr.toUpperCase();
                }),
                datasets: [{
                  data: displayData.breakdown.slice(0, 6).map(item => item.total),
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  strokeWidth: 3
                }]
              }}
              width={screenWidth}
              height={260}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: 'transparent',
                backgroundGradientTo: 'transparent',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.8})`,
                style: {
                  borderRadius: 0,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '3',
                  stroke: '#fff',
                  fill: colors.primary
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: 'rgba(255,255,255,0.15)',
                  strokeWidth: 1,
                },
              }}
              bezier
              style={{
                marginVertical: 0,
                marginLeft: -16,
              }}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyChartText}>No data available</Text>
            </View>
          )}
        </LinearGradient>
        
        <View style={{ height: 20 }} />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  backButton: {
    padding: 4,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  firstHalf: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  monthCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 4,
  },
  monthInfo: {
    alignItems: 'center',
    flex: 1,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 1.5,
    opacity: 0.7,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  chipContainer: {
    marginBottom: 20,
  },
  chipContent: {
    paddingRight: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chipSelected: {
    shadowColor: '#16a34a',
    shadowOpacity: 0.2,
    elevation: 4,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 8,
  },
  categoryCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transactionCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  secondHalf: {
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 16,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 16,
    marginLeft: 4,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChartText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});
