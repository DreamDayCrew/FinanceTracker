import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getThemedColors } from '../lib/utils';
import { MoreStackParamList } from '../../App';
import type { Transaction } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

type CategoryTransactionsRouteProp = RouteProp<MoreStackParamList, 'CategoryTransactions'>;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function CategoryTransactionsScreen() {
  const route = useRoute<CategoryTransactionsRouteProp>();
  const navigation = useNavigation();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const { categoryId, categoryName, month, year } = route.params || {};

  // Redirect if params are missing
  if (!categoryId || !categoryName || !month || !year) {
    navigation.goBack();
    return null;
  }

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: api.getTransactions,
  });

  // Filter transactions by category and month
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction: Transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      return (
        transaction.type === 'debit' &&
        transaction.categoryId === categoryId &&
        transactionDate.getMonth() + 1 === month &&
        transactionDate.getFullYear() === year
      );
    }).sort((a: Transaction, b: Transaction) => 
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }, [transactions, categoryId, month, year]);

  const totalSpent = useMemo(() => {
    return filteredTransactions.reduce((sum: number, t: Transaction) => 
      sum + parseFloat(t.amount), 0
    );
  }, [filteredTransactions]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.monthBadge, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.monthText, { color: colors.textMuted }]}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Spent</Text>
        <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
          {formatCurrency(totalSpent)}
        </Text>
        <Text style={[styles.summaryCount, { color: colors.textMuted }]}>
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction: Transaction) => (
            <View 
              key={transaction.id} 
              style={[styles.transactionCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.transactionContent}>
                <View style={styles.transactionHeader}>
                  <Text style={[styles.transactionDescription, { color: colors.text }]}>
                    {transaction.description || transaction.merchant || 'Transaction'}
                  </Text>
                  <Text style={[styles.transactionAmount, { color: '#ef4444' }]}>
                    -{formatCurrency(transaction.amount)}
                  </Text>
                </View>
                <View style={styles.transactionMeta}>
                  <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                    {formatDate(transaction.transactionDate)}
                  </Text>
                  {transaction.account && (
                    <Text style={[styles.transactionAccount, { color: colors.textMuted }]}>
                      {transaction.account.name}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No transactions</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              No spending in this category for {MONTH_NAMES[month - 1]}
            </Text>
          </View>
        )}
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
  monthBadge: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  transactionCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDate: {
    fontSize: 14,
  },
  transactionAccount: {
    fontSize: 14,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
