import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getThemedColors } from '../lib/utils';
import { RootStackParamList } from '../../App';
import { FABButton } from '../components/FABButton';
import type { Transaction } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TransactionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: api.getTransactions,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleDelete = (transaction: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate(transaction.id)
        },
      ]
    );
  };

  const filteredTransactions = transactions?.filter(t => {
    const matchesSearch = search === '' || 
      t.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || t.type === filter;
    
    return matchesSearch && matchesFilter;
  }) || [];

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'credit', 'debit'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton, 
              { backgroundColor: filter === f ? colors.primary : colors.card }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText, 
              { color: filter === f ? '#ffffff' : colors.textMuted }
            ]}>
              {f === 'all' ? 'All' : f === 'credit' ? 'Income' : 'Expense'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              style={[styles.transactionItem, { backgroundColor: colors.card }]}
              onLongPress={() => handleDelete(transaction)}
            >
              <View style={[
                styles.transactionIcon,
                { backgroundColor: transaction.type === 'credit' ? colors.primary + '20' : colors.danger + '20' }
              ]}>
                <Ionicons 
                  name={transaction.type === 'credit' ? 'arrow-down' : 'arrow-up'} 
                  size={20} 
                  color={transaction.type === 'credit' ? colors.primary : colors.danger}
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={[styles.transactionMerchant, { color: colors.text }]}>
                  {transaction.merchant || transaction.category?.name || 'Transaction'}
                </Text>
                <Text style={[styles.transactionCategory, { color: colors.textMuted }]}>
                  {transaction.category?.name} {transaction.account && `• ${transaction.account.name}`}
                </Text>
                <Text style={[styles.transactionDate, { color: colors.textMuted }]}>{formatDate(transaction.transactionDate)}</Text>
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: transaction.type === 'credit' ? colors.primary : colors.danger }
              ]}>
                {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No transactions found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Tap + to add your first transaction</Text>
          </View>
        )}

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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionMerchant: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionCategory: {
    fontSize: 13,
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});
