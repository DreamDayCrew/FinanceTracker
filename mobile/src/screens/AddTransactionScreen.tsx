import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { COLORS } from '../lib/utils';
import type { Category, Account } from '../lib/types';

export default function AddTransactionScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const mutation = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add transaction');
    },
  });

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    mutation.mutate({
      type,
      amount,
      merchant: merchant || null,
      description: description || null,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      transactionDate: new Date().toISOString(),
      smsHash: null,
    });
  };

  const filteredCategories = categories?.filter(c => 
    type === 'credit' ? c.type === 'income' : c.type === 'expense'
  ) || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, type === 'debit' && styles.typeButtonActive]}
          onPress={() => setType('debit')}
        >
          <Ionicons name="arrow-up" size={20} color={type === 'debit' ? '#fff' : COLORS.danger} />
          <Text style={[styles.typeText, type === 'debit' && styles.typeTextActive]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, styles.typeButtonIncome, type === 'credit' && styles.typeButtonIncomeActive]}
          onPress={() => setType('credit')}
        >
          <Ionicons name="arrow-down" size={20} color={type === 'credit' ? '#fff' : COLORS.primary} />
          <Text style={[styles.typeText, type === 'credit' && styles.typeTextActive]}>Income</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>₹</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Merchant / Payee</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Amazon, Grocery Store"
          placeholderTextColor={COLORS.textMuted}
          value={merchant}
          onChangeText={setMerchant}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Add a note..."
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategoryId === category.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategoryId(category.id)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategoryId === category.id && styles.categoryChipTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {accounts && accounts.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.categoryChip,
                  selectedAccountId === account.id && styles.categoryChipActive
                ]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <Ionicons 
                  name={account.type === 'bank' ? 'business-outline' : 'card-outline'} 
                  size={14} 
                  color={selectedAccountId === account.id ? '#fff' : COLORS.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[
                  styles.categoryChipText,
                  selectedAccountId === account.id && styles.categoryChipTextActive
                ]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitButton, mutation.isPending && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Add Transaction</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: COLORS.danger,
  },
  typeButtonIncome: {
    backgroundColor: '#f0fdf4',
  },
  typeButtonIncomeActive: {
    backgroundColor: COLORS.primary,
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  typeTextActive: {
    color: '#ffffff',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  currencySymbol: {
    fontSize: 40,
    fontWeight: '300',
    color: COLORS.textMuted,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 100,
    textAlign: 'center',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
