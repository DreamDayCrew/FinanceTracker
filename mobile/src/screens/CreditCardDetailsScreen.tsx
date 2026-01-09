import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors, getOrdinalSuffix } from '../lib/utils';
import { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;

export default function CreditCardDetailsScreen() {
  const navigation = useNavigation();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: api.getTransactions,
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const creditCards = useMemo(() => {
    return accounts?.filter(acc => acc.type === 'credit_card' && acc.isActive) || [];
  }, [accounts]);

  const filteredData = useMemo(() => {
    if (!transactions || !creditCards.length) return null;

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const cardBreakdown = creditCards.map(card => {
      const cardTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.transactionDate);
        return t.accountId === card.id &&
               t.type === 'debit' &&
               transactionDate >= startOfMonth &&
               transactionDate <= endOfMonth;
      });

      const totalSpent = cardTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      return {
        accountId: card.id,
        accountName: card.name,
        color: card.color || colors.primary,
        billingDate: card.billingDate || 1,
        creditLimit: card.creditLimit ? parseFloat(card.creditLimit) : 0,
        totalSpent,
        transactionCount: cardTransactions.length,
        transactions: cardTransactions.sort((a, b) => 
          new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        ),
      };
    }).filter(card => card.transactionCount > 0);

    const totalSpending = cardBreakdown.reduce((sum, card) => sum + card.totalSpent, 0);

    return {
      totalSpending,
      breakdown: cardBreakdown,
    };
  }, [transactions, creditCards, selectedMonth, selectedYear, colors]);

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

  const pieChartData = useMemo(() => {
    if (!filteredData?.breakdown || filteredData.breakdown.length === 0) return [];
    
    return filteredData.breakdown.map((card, index) => ({
      name: card.accountName.length > 12 ? card.accountName.substring(0, 12) + '...' : card.accountName,
      amount: card.totalSpent,
      color: card.color,
      legendFontColor: colors.text,
      legendFontSize: 13,
    }));
  }, [filteredData, colors]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load credit card details</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit Card Details</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={[styles.monthNavigation, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {monthNames[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity 
          onPress={handleNextMonth} 
          style={styles.navButton}
          disabled={isCurrentMonth}
        >
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isCurrentMonth ? colors.textMuted : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
        <Ionicons name="card-outline" size={32} color="#ff9800" style={{ marginBottom: 8 }} />
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Credit Card Spending</Text>
        <Text style={[styles.totalAmount, { color: '#ff9800' }]}>
          {formatCurrency(filteredData?.totalSpending || 0)}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Pie Chart Section */}
        {pieChartData.length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Spending Distribution</Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Card Breakdown</Text>
          
          {filteredData?.breakdown && filteredData.breakdown.length > 0 ? (
            filteredData.breakdown.map((card) => {
              const percentage = filteredData.totalSpending > 0 
                ? Math.round((card.totalSpent / filteredData.totalSpending) * 100)
                : 0;
              const utilizationPercent = card.creditLimit > 0
                ? (card.totalSpent / card.creditLimit) * 100
                : 0;
              
              return (
                <View key={card.accountId} style={[styles.cardItem, { backgroundColor: colors.card }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardNameRow}>
                      <View style={[styles.colorDot, { backgroundColor: card.color }]} />
                      <View>
                        <Text style={[styles.cardName, { color: colors.text }]}>
                          {card.accountName}
                        </Text>
                        <Text style={[styles.billingInfo, { color: colors.textMuted }]}>
                          Billing Date: {card.billingDate}{getOrdinalSuffix(card.billingDate)} of month
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardAmounts}>
                      <Text style={[styles.cardAmount, { color: colors.text }]}>
                        {formatCurrency(card.totalSpent)}
                      </Text>
                      {card.creditLimit > 0 && (
                        <Text style={[styles.limitText, { color: colors.textMuted }]}>
                          of {formatCurrency(card.creditLimit)}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.cardFooter}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${percentage}%`, backgroundColor: card.color }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.percentageText, { color: colors.textMuted }]}>
                      {percentage}%
                    </Text>
                  </View>
                  
                  {card.creditLimit > 0 && (
                    <View style={styles.utilizationRow}>
                      <Text style={[styles.utilizationLabel, { color: colors.textMuted }]}>
                        Credit Utilization:
                      </Text>
                      <Text style={[
                        styles.utilizationValue,
                        { 
                          color: utilizationPercent >= 90 ? '#f44336' : 
                                 utilizationPercent >= 70 ? '#ff9800' : '#4CAF50'
                        }
                      ]}>
                        {utilizationPercent.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                  
                  <Text style={[styles.transactionCount, { color: colors.textMuted }]}>
                    {card.transactionCount} transaction{card.transactionCount !== 1 ? 's' : ''}
                  </Text>

                  {card.transactions.length > 0 && (
                    <View style={styles.recentTransactions}>
                      <Text style={[styles.transactionsHeader, { color: colors.textMuted }]}>
                        Recent Transactions
                      </Text>
                      {card.transactions.slice(0, 3).map((transaction) => (
                        <View 
                          key={transaction.id} 
                          style={[styles.transactionRow, { borderBottomColor: colors.border }]}
                        >
                          <View style={styles.transactionInfo}>
                            <Text style={[styles.merchantName, { color: colors.text }]}>
                              {transaction.merchant || transaction.category?.name || 'Transaction'}
                            </Text>
                            <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                              {new Date(transaction.transactionDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.transactionAmount, { color: '#f44336' }]}>
                            {formatCurrency(transaction.amount)}
                          </Text>
                        </View>
                      ))}
                      {card.transactions.length > 3 && (
                        <Text style={[styles.moreTransactions, { color: colors.primary }]}>
                          +{card.transactions.length - 3} more transaction{card.transactions.length - 3 !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="card-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No credit card spending this month
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
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
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  totalLabel: {
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chartSection: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
  },
  cardItem: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  billingInfo: {
    fontSize: 11,
    opacity: 0.7,
  },
  cardAmounts: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  limitText: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.7,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 38,
    textAlign: 'right',
  },
  utilizationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  utilizationLabel: {
    fontSize: 12,
  },
  utilizationValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  transactionCount: {
    fontSize: 12,
    marginBottom: 12,
  },
  recentTransactions: {
    marginTop: 8,
    paddingTop: 12,
  },
  transactionsHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  moreTransactions: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});
