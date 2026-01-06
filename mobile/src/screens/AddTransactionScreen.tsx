import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Platform, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { getThemedColors } from '../lib/utils';
import type { Category, Account } from '../lib/types';
import { RootStackParamList } from '../../App';
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

type AddTransactionRouteProp = RouteProp<RootStackParamList, 'AddTransaction'>;

export default function AddTransactionScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddTransactionRouteProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const transactionId = route.params?.transactionId;
  const isEditMode = !!transactionId;
  
  const [type, setType] = useState<'debit' | 'credit' | 'transfer'>('debit');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedToAccountId, setSelectedToAccountId] = useState<number | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  // Auto-select default account for new transactions
  React.useEffect(() => {
    if (!isEditMode && accounts && !selectedAccountId) {
      const defaultAccount = accounts.find(acc => acc.isDefault);
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      }
    }
  }, [accounts, isEditMode, selectedAccountId]);

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: api.getTransactions,
    enabled: isEditMode,
  });

  // Load transaction data for edit mode
  React.useEffect(() => {
    if (isEditMode && transactions) {
      const transaction = transactions.find((t: any) => t.id === transactionId);
      if (transaction) {
        setType(transaction.type as 'debit' | 'credit' | 'transfer');
        setAmount(transaction.amount);
        setMerchant(transaction.merchant || '');
        setDescription(transaction.description || '');
        setSelectedCategoryId(transaction.categoryId || null);
        setSelectedAccountId(transaction.accountId || null);
        setSelectedToAccountId(transaction.toAccountId || null);
        setTransactionDate(new Date(transaction.transactionDate));
      }
    }
  }, [isEditMode, transactions, transactionId]);

  const createMutation = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      navigation.goBack();
      Toast.show({
        type: 'success',
        text1: 'Transaction Created',
        text2: 'Transaction has been added successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Create Failed',
        text2: 'Could not create transaction. Please try again.',
        position: 'bottom',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['monthlyExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      navigation.goBack();
      Toast.show({
        type: 'success',
        text1: 'Transaction Updated',
        text2: 'Transaction has been updated successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not update transaction. Please try again.',
        position: 'bottom',
      });
    },
  });

  const handleParseSms = async () => {
    if (!smsText.trim()) {
      Alert.alert('Error', 'Please paste your bank SMS');
      return;
    }

    setIsParsing(true);
    try {
      const result = await api.parseSms(smsText);
      
      if (result.success && result.transaction) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['monthlyExpenses'] });
        queryClient.invalidateQueries({ queryKey: ['categoryBreakdown'] });
        setShowSmsModal(false);
        setSmsText('');
        Alert.alert('Success', 'Transaction added from SMS!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else if (result.parsed) {
        setAmount(result.parsed.amount.toString());
        setType(result.parsed.type);
        if (result.parsed.merchant) setMerchant(result.parsed.merchant);
        if (result.parsed.description) setDescription(result.parsed.description);
        setShowSmsModal(false);
        setSmsText('');
        Alert.alert('Parsed!', 'SMS data extracted. Please review and save.');
      } else {
        Alert.alert('Could Not Parse', result.message || 'Unable to extract transaction from this SMS. Please enter manually.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse SMS';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid amount',
        position: 'bottom',
      });
      return;
    }

    if (type === 'transfer' && (!selectedAccountId || !selectedToAccountId)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select both From and To accounts',
        position: 'bottom',
      });
      return;
    }

    if (type === 'transfer' && selectedAccountId === selectedToAccountId) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'From and To accounts must be different',
        position: 'bottom',
      });
      return;
    }

    const transactionData: any = {
      type,
      amount,
      merchant: merchant || null,
      description: description || null,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      transactionDate: transactionDate.toISOString(),
    };

    if (type === 'transfer') {
      transactionData.toAccountId = selectedToAccountId;
    }

    if (isEditMode && transactionId) {
      updateMutation.mutate({ id: transactionId, data: transactionData });
    } else {
      createMutation.mutate(transactionData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredCategories = categories?.filter(c => 
    type === 'credit' ? c.type === 'income' : c.type === 'expense'
  ) || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={[styles.smsButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowSmsModal(true)}>
        <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.primary} />
        <Text style={[styles.smsButtonText, { color: colors.text }]}>Paste Bank SMS</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, { backgroundColor: colors.card, borderColor: colors.border }, type === 'debit' && { backgroundColor: '#EF4444' }]}
          onPress={() => setType('debit')}
        >
          <Ionicons name="arrow-up" size={20} color={type === 'debit' ? '#fff' : '#EF4444'} />
          <Text style={[styles.typeText, { color: colors.text }, type === 'debit' && { color: '#fff' }]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, { backgroundColor: colors.card, borderColor: colors.border }, type === 'credit' && { backgroundColor: colors.primary }]}
          onPress={() => setType('credit')}
        >
          <Ionicons name="arrow-down" size={20} color={type === 'credit' ? '#fff' : colors.primary} />
          <Text style={[styles.typeText, { color: colors.text }, type === 'credit' && { color: '#fff' }]}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, { backgroundColor: colors.card, borderColor: colors.border }, type === 'transfer' && { backgroundColor: '#007AFF' }]}
          onPress={() => setType('transfer')}
        >
          <Ionicons name="swap-horizontal" size={24} color={type === 'transfer' ? '#fff' : '#007AFF'} />
          <Text style={[styles.typeText, { color: colors.text }, type === 'transfer' && { color: '#fff' }]}>Transfer</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.amountContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text }]}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Merchant / Payee</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g., Amazon, Grocery Store"
          placeholderTextColor={colors.textMuted}
          value={merchant}
          onChangeText={setMerchant}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Date</Text>
        <TouchableOpacity 
          style={[styles.dateInput, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {transactionDate.toLocaleDateString('en-US', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={transactionDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setTransactionDate(selectedDate);
            }
          }}
          maximumDate={new Date()}
        />
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Description (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Add a note..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCategoryId === category.id && { backgroundColor: colors.primary }
              ]}
              onPress={() => setSelectedCategoryId(category.id)}
            >
              <Text style={[
                styles.categoryChipText,
                { color: colors.text },
                selectedCategoryId === category.id && { color: '#fff' }
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {accounts && accounts.length > 0 && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {type === 'transfer' ? 'From Account' : 'Account'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedAccountId === account.id && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <Ionicons 
                  name={account.type === 'bank' ? 'business-outline' : 'card-outline'} 
                  size={14} 
                  color={selectedAccountId === account.id ? '#fff' : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[
                  styles.categoryChipText,
                  { color: colors.text },
                  selectedAccountId === account.id && { color: '#fff' }
                ]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {type === 'transfer' && accounts && accounts.length > 0 && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>To Account</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {accounts.filter(acc => acc.id !== selectedAccountId).map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedToAccountId === account.id && { backgroundColor: '#007AFF' }
                ]}
                onPress={() => setSelectedToAccountId(account.id)}
              >
                <Ionicons 
                  name={account.type === 'bank' ? 'business-outline' : 'card-outline'} 
                  size={14} 
                  color={selectedToAccountId === account.id ? '#fff' : colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[
                  styles.categoryChipText,
                  { color: colors.text },
                  selectedToAccountId === account.id && { color: '#fff' }
                ]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitButton, { backgroundColor: colors.primary }, isPending && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isEditMode ? 'Update Transaction' : 'Add Transaction'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      <Modal
        visible={showSmsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSmsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Paste Bank SMS</Text>
              <TouchableOpacity onPress={() => setShowSmsModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
              Copy a transaction SMS from your bank and paste it below. We'll automatically extract the transaction details.
            </Text>

            <TextInput
              style={[styles.smsInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Paste your bank SMS here...&#10;&#10;Example:&#10;Rs.500.00 debited from A/c XX1234 on 06-Dec-24. UPI/123456789. If not done by u, call 1800-XXX-XXXX"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
              value={smsText}
              onChangeText={setSmsText}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={[styles.parseButton, { backgroundColor: colors.primary }, isParsing && styles.parseButtonDisabled]} 
              onPress={handleParseSms}
              disabled={isParsing}
            >
              {isParsing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <Text style={styles.parseButtonText}>Parse SMS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  smsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  smsButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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
    gap: 8,
  },
  typeButtonActive: {
  },
  typeButtonIncome: {
  },
  typeButtonIncomeActive: {
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
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
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'center',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  dateInput: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
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
    marginRight: 8,
  },
  categoryChipActive: {
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  submitButton: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  smsInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 150,
    marginBottom: 16,
  },
  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  parseButtonDisabled: {
    opacity: 0.7,
  },
  parseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
