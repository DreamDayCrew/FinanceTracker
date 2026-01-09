import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { getThemedColors } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { MoreStackParamList } from '../../App';
import React from 'react';

type AddScheduledPaymentRouteProp = RouteProp<MoreStackParamList, 'AddScheduledPayment'>;

export default function AddScheduledPaymentScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddScheduledPaymentRouteProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const paymentId = route.params?.paymentId;
  const isEditMode = !!paymentId;
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [affectTransaction, setAffectTransaction] = useState(true);
  const [affectAccountBalance, setAffectAccountBalance] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const selectedCategory = categories?.find((c: any) => c.id === selectedCategoryId);
  const selectedAccount = accounts?.find((a: any) => a.id === selectedAccountId);

  const { data: payments } = useQuery({
    queryKey: ['scheduled-payments'],
    queryFn: api.getScheduledPayments,
    enabled: isEditMode,
  });

  // Auto-select default account for new payments
  React.useEffect(() => {
    if (!isEditMode && accounts && !selectedAccountId) {
      const defaultAccount = accounts.find(acc => acc.isDefault);
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      }
    }
  }, [accounts, isEditMode, selectedAccountId]);

  // Load payment data for edit mode
  React.useEffect(() => {
    if (isEditMode && payments) {
      const payment = payments.find((p: any) => p.id === paymentId);
      if (payment) {
        setName(payment.name);
        setAmount(payment.amount);
        setDueDate(payment.dueDate.toString());
        setNotes(payment.notes || '');
        setSelectedCategoryId(payment.categoryId || null);
        setSelectedAccountId(payment.accountId || null);
        setAffectTransaction(payment.affectTransaction ?? true);
        setAffectAccountBalance(payment.affectAccountBalance ?? true);
      }
    }
  }, [isEditMode, payments, paymentId]);

  const createMutation = useMutation({
    mutationFn: api.createScheduledPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({
        type: 'success',
        text1: 'Payment Added',
        text2: 'Scheduled payment has been created',
        position: 'bottom',
      });
      navigation.goBack();
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add scheduled payment',
        position: 'bottom',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!paymentId) throw new Error('Payment ID is required');
      return api.updateScheduledPayment(paymentId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({
        type: 'success',
        text1: 'Payment Updated',
        text2: 'Scheduled payment has been updated',
        position: 'bottom',
      });
      navigation.goBack();
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update scheduled payment',
        position: 'bottom',
      });
    },
  });

  const mutation = isEditMode ? updateMutation : createMutation;

  const handleSubmit = () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter payment name',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid amount',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    const dueDateNum = parseInt(dueDate);
    if (!dueDate || isNaN(dueDateNum) || dueDateNum < 1 || dueDateNum > 31) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Due Date',
        text2: 'Due date must be between 1 and 31',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }

    mutation.mutate({
      name: name.trim(),
      amount,
      dueDate: dueDateNum,
      notes: notes.trim() || null,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      status: 'active',
      affectTransaction,
      affectAccountBalance,
    });
  };

  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Payment Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="e.g., Rent, Netflix, Maid Salary"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Amount</Text>
        <View style={[styles.amountInputContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Due Date (Day of Month)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g., 1, 15, 28"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={2}
          value={dueDate}
          onChangeText={setDueDate}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Category (optional)</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Ionicons name="pricetag-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.dropdownText, { color: selectedCategory ? colors.text : colors.textMuted }]}>
            {selectedCategory ? selectedCategory.name : 'Select Category'}
          </Text>
        </TouchableOpacity>
        {showCategoryPicker && expenseCategories && (
          <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setSelectedCategoryId(null); setShowCategoryPicker(false); }}
            >
              <Text style={[styles.dropdownItemText, { color: colors.textMuted }]}>None</Text>
            </TouchableOpacity>
            {expenseCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.dropdownItem}
                onPress={() => { setSelectedCategoryId(category.id); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.dropdownItemText, { color: colors.text }]}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Account (optional)</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowAccountPicker(!showAccountPicker)}
        >
          <Ionicons name="wallet-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.dropdownText, { color: selectedAccount ? colors.text : colors.textMuted }]}>
            {selectedAccount ? selectedAccount.name : 'Select Account'}
          </Text>
        </TouchableOpacity>
        {showAccountPicker && accounts && (
          <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setSelectedAccountId(null); setShowAccountPicker(false); }}
            >
              <Text style={[styles.dropdownItemText, { color: colors.textMuted }]}>None</Text>
            </TouchableOpacity>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.dropdownItem}
                onPress={() => { setSelectedAccountId(account.id); setShowAccountPicker(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{account.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Add any notes..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Transaction Options</Text>
        {isEditMode && (
          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Changing these settings will only apply to future payments. Past transactions remain unchanged.
            </Text>
          </View>
        )}
        <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Create Transaction</Text>
              <Text style={[styles.toggleDescription, { color: colors.textMuted }]}>Add to transaction history when paid</Text>
            </View>
            <Switch
              value={affectTransaction}
              onValueChange={setAffectTransaction}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Affect Account Balance</Text>
              <Text style={[styles.toggleDescription, { color: colors.textMuted }]}>Update account balance when paid</Text>
            </View>
            <Switch
              value={affectAccountBalance}
              onValueChange={setAffectAccountBalance}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, { backgroundColor: colors.primary }, mutation.isPending && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{isEditMode ? 'Update Payment' : 'Add Payment'}</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 18,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  dropdownButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownText: {
    fontSize: 15,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  toggleContainer: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
});
