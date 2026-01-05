import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Account, InsertLoan } from '../lib/types';

const LOAN_TYPES = [
  { value: 'home_loan', label: 'Home Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'credit_card_loan', label: 'Credit Card Loan' },
  { value: 'item_emi', label: 'Product/Item EMI' },
];

type RootStackParamList = {
  Loans: undefined;
  AddLoan: undefined;
};

export default function AddLoanScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    type: 'personal_loan',
    lenderName: '',
    loanAccountNumber: '',
    principalAmount: '',
    interestRate: '',
    tenure: '',
    emiAmount: '',
    emiDay: '1',
    startDate: new Date().toISOString().split('T')[0],
    accountId: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts(),
  });

  // Auto-select default account
  useMemo(() => {
    if (!formData.accountId && accounts.length > 0) {
      const defaultAccount = accounts.find(acc => acc.isDefault);
      if (defaultAccount) {
        setFormData(prev => ({ ...prev, accountId: defaultAccount.id.toString() }));
      }
    }
  }, [accounts]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        type: data.type,
        lenderName: data.lenderName || undefined,
        loanAccountNumber: data.loanAccountNumber || undefined,
        principalAmount: data.principalAmount,
        outstandingAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenure: parseInt(data.tenure),
        emiAmount: data.emiAmount || undefined,
        emiDay: parseInt(data.emiDay) || undefined,
        startDate: data.startDate,
        accountId: data.accountId ? parseInt(data.accountId) : undefined,
        status: 'active' as const,
        userId: null,
      };
      return api.createLoan(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-summary'] });
      Toast.show({
        type: 'success',
        text1: 'Loan Added',
        text2: 'Your loan has been added successfully',
        position: 'bottom',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Add Loan',
        text2: error.message || 'Could not add loan',
        position: 'bottom',
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.principalAmount || !formData.interestRate || 
        !formData.tenure || !formData.emiAmount) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill all required fields',
        position: 'bottom',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Loan Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., Home Loan - SBI"
            placeholderTextColor={colors.textMuted}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Loan Type *</Text>
          <View style={styles.loanTypeGrid}>
            {LOAN_TYPES.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.loanTypeButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  formData.type === type.value && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => setFormData({ ...formData, type: type.value })}
              >
                <Text style={[
                  styles.loanTypeText,
                  { color: colors.text },
                  formData.type === type.value && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Lender/Bank Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., State Bank of India"
            placeholderTextColor={colors.textMuted}
            value={formData.lenderName}
            onChangeText={(text) => setFormData({ ...formData, lenderName: text })}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Loan Account Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
            value={formData.loanAccountNumber}
            onChangeText={(text) => setFormData({ ...formData, loanAccountNumber: text })}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Principal Amount (₹) *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder="e.g., 1000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={formData.principalAmount}
            onChangeText={(text) => setFormData({ ...formData, principalAmount: text })}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Interest Rate (%) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., 8.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={formData.interestRate}
              onChangeText={(text) => setFormData({ ...formData, interestRate: text })}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Tenure (months) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., 60"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.tenure}
              onChangeText={(text) => setFormData({ ...formData, tenure: text })}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Monthly EMI (₹) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g., 20000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.emiAmount}
              onChangeText={(text) => setFormData({ ...formData, emiAmount: text })}
            />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>EMI Due Day *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="1-28"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.emiDay}
              onChangeText={(text) => setFormData({ ...formData, emiDay: text })}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Start Date</Text>
          <TouchableOpacity
            style={[styles.datePickerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
            <Text style={[styles.datePickerText, { color: colors.text }]}>
              {formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-IN', { 
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>

        {accounts.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Link to Account (optional)</Text>
            <View style={styles.accountList}>
              <TouchableOpacity
                style={[
                  styles.accountOption,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  !formData.accountId && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => setFormData({ ...formData, accountId: '' })}
              >
                <Text style={[
                  styles.accountOptionText,
                  { color: colors.text },
                  !formData.accountId && { color: colors.primary, fontWeight: '600' }
                ]}>
                  None
                </Text>
              </TouchableOpacity>
              {accounts.map(account => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountOption,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    formData.accountId === account.id.toString() && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => setFormData({ ...formData, accountId: account.id.toString() })}
                >
                  <Text style={[
                    styles.accountOptionText,
                    { color: colors.text },
                    formData.accountId === account.id.toString() && { color: colors.primary, fontWeight: '600' }
                  ]}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Add Loan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <View style={styles.modalOverlay}>
          <View style={[styles.datePickerModal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <ScrollView style={styles.datePickerScroll}>
                {(() => {
                  const today = new Date();
                  const dates = [];
                  
                  // Show dates from 2 years ago to today
                  for (let monthsAgo = 24; monthsAgo >= 0; monthsAgo--) {
                    const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
                    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                    
                    for (let day = 1; day <= daysInMonth; day++) {
                      const currentDate = new Date(date.getFullYear(), date.getMonth(), day);
                      if (currentDate <= today) {
                        const dateStr = currentDate.toISOString().split('T')[0];
                        const isSelected = formData.startDate === dateStr;
                        
                        dates.push(
                          <TouchableOpacity
                            key={dateStr}
                            style={[
                              styles.dateOption,
                              { backgroundColor: colors.background, borderColor: colors.border },
                              isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                            ]}
                            onPress={() => {
                              setFormData({ ...formData, startDate: dateStr });
                              setShowDatePicker(false);
                            }}
                          >
                            <Text style={[
                              styles.dateOptionText,
                              { color: colors.text },
                              isSelected && { color: colors.primary, fontWeight: '600' }
                            ]}>
                              {currentDate.toLocaleDateString('en-IN', { 
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    }
                  }
                  
                  return dates.reverse(); // Show most recent first
                })()}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loanTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loanTypeButton: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  loanTypeText: {
    fontSize: 14,
  },
  accountList: {
    gap: 8,
  },
  accountOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  accountOptionText: {
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  datePickerText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  datePickerModal: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  datePickerContent: {
    maxHeight: 400,
  },
  datePickerScroll: {
    padding: 16,
  },
  dateOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  dateOptionText: {
    fontSize: 15,
  },
});
