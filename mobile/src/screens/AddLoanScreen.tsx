import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Switch, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Account, InsertLoan, Loan } from '../lib/types';

const LOAN_TYPES = [
  { value: 'home_loan', label: 'Home Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'credit_card_loan', label: 'Credit Card Loan' },
  { value: 'item_emi', label: 'Product/Item EMI' },
];

type RootStackParamList = {
  Loans: undefined;
  AddLoan: { loanId?: number };
};

export default function AddLoanScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<NativeStackScreenProps<RootStackParamList, 'AddLoan'>['route']>();
  const queryClient = useQueryClient();
  
  const loanId = route.params?.loanId;
  const isEditMode = !!loanId;

  const [formData, setFormData] = useState({
    name: '',
    type: 'personal_loan',
    lenderName: '',
    loanAccountNumber: '',
    principalAmount: '',
    outstandingAmount: '',
    interestRate: '',
    tenure: '',
    emiAmount: '',
    emiDay: '1',
    accountId: '',
  });
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [nextEmiDate, setNextEmiDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showNextEmiDatePicker, setShowNextEmiDatePicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isExistingLoan, setIsExistingLoan] = useState(false);
  const [createTransaction, setCreateTransaction] = useState(false);
  const [affectBalance, setAffectBalance] = useState(false);

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts(),
  });

  // Fetch existing loan data if in edit mode
  const { data: existingLoan, isLoading: isLoadingLoan } = useQuery<Loan>({
    queryKey: ['loan', loanId],
    queryFn: () => api.getLoan(loanId!),
    enabled: isEditMode,
  });

  // Populate form with existing loan data
  useEffect(() => {
    if (existingLoan && isEditMode) {
      setFormData({
        name: existingLoan.name,
        type: existingLoan.loanType || existingLoan.type || 'personal_loan',
        lenderName: existingLoan.lenderName || '',
        loanAccountNumber: existingLoan.loanAccountNumber || '',
        principalAmount: existingLoan.principalAmount,
        outstandingAmount: existingLoan.outstandingAmount || existingLoan.principalAmount,
        interestRate: existingLoan.interestRate,
        tenure: existingLoan.tenure?.toString() || '',
        emiAmount: existingLoan.emiAmount || '',
        emiDay: existingLoan.emiDay?.toString() || '1',
        accountId: existingLoan.accountId?.toString() || '',
      });
      
      if (existingLoan.startDate) {
        setStartDate(new Date(existingLoan.startDate));
      }
      
      if (existingLoan.nextEmiDate) {
        setNextEmiDate(new Date(existingLoan.nextEmiDate));
      }
      
      if (existingLoan.endDate) {
        setEndDate(new Date(existingLoan.endDate));
      }
      
      setIsExistingLoan(existingLoan.isExistingLoan ?? false);
      
      // Set toggle values - check both snake_case and camelCase
      const createTxn = (existingLoan as any).createTransaction ?? (existingLoan as any).create_transaction ?? false;
      const affectBal = (existingLoan as any).affectBalance ?? (existingLoan as any).affect_balance ?? false;
      
      setCreateTransaction(createTxn);
      setAffectBalance(affectBal);
    }
  }, [existingLoan, isEditMode]);

  // Auto-select default account
  useEffect(() => {
    if (!formData.accountId && accounts.length > 0 && !isEditMode) {
      const defaultAccount = accounts.find(acc => acc.isDefault);
      if (defaultAccount) {
        setFormData(prev => ({ ...prev, accountId: defaultAccount.id.toString() }));
      }
    }
  }, [accounts, isEditMode]);

  // Calculate end date based on start date and tenure
  useEffect(() => {
    if (formData.tenure && startDate) {
      const tenureMonths = parseInt(formData.tenure);
      if (!isNaN(tenureMonths) && tenureMonths > 0) {
        const calculatedEndDate = new Date(startDate);
        calculatedEndDate.setMonth(calculatedEndDate.getMonth() + tenureMonths);
        setEndDate(calculatedEndDate);
      } else {
        setEndDate(null);
      }
    } else {
      setEndDate(null);
    }
  }, [formData.tenure, startDate]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        type: data.type,
        lenderName: data.lenderName || undefined,
        loanAccountNumber: data.loanAccountNumber || undefined,
        principalAmount: data.principalAmount,
        outstandingAmount: isExistingLoan ? data.outstandingAmount : data.principalAmount,
        interestRate: data.interestRate,
        tenure: parseInt(data.tenure),
        emiAmount: data.emiAmount || undefined,
        emiDay: parseInt(data.emiDay) || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        accountId: data.accountId ? parseInt(data.accountId) : undefined,
        status: 'active' as const,
        userId: null,
        isExistingLoan,
        nextEmiDate: isExistingLoan ? nextEmiDate.toISOString() : undefined,
        createTransaction,
        affectBalance,
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

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // For non-existing loans, keep the current outstanding amount from DB
      // For existing loans, use the form's outstanding amount
      const outstandingToSend = isExistingLoan 
        ? data.outstandingAmount 
        : (existingLoan?.outstandingAmount || data.principalAmount);
      
      const payload: any = {
        name: data.name,
        type: data.type,
        lenderName: data.lenderName || undefined,
        loanAccountNumber: data.loanAccountNumber || undefined,
        principalAmount: data.principalAmount,
        outstandingAmount: outstandingToSend,
        interestRate: data.interestRate,
        tenure: parseInt(data.tenure),
        emiAmount: data.emiAmount || undefined,
        emiDay: parseInt(data.emiDay) || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        accountId: data.accountId ? parseInt(data.accountId) : undefined,
        createTransaction,
        affectBalance,
        nextEmiDate: isExistingLoan ? nextEmiDate.toISOString() : undefined,
      };
      return api.updateLoan(loanId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-summary'] });
      Toast.show({
        type: 'success',
        text1: 'Loan Updated',
        text2: 'Your loan has been updated successfully',
        position: 'bottom',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Loan',
        text2: error.message || 'Could not update loan',
        position: 'bottom',
      });
    },
  });

  const handleSubmit = () => {
    // Validate required fields
    const missingFields: string[] = [];
    
    if (!formData.name) missingFields.push('Loan Name');
    if (!formData.principalAmount) missingFields.push(isExistingLoan ? 'Original Loan Amount' : 'Principal Amount');
    if (isExistingLoan && !formData.outstandingAmount) missingFields.push('Current Outstanding');
    if (!formData.interestRate) missingFields.push('Interest Rate');
    if (!formData.tenure) missingFields.push('Tenure');
    if (!formData.emiAmount) missingFields.push('EMI Amount');
    
    if (missingFields.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: missingFields.join(', '),
        position: 'bottom',
      });
      return;
    }
    
    // Validate that outstanding is not greater than principal for existing loans
    if (isExistingLoan) {
      const principal = parseFloat(formData.principalAmount);
      const outstanding = parseFloat(formData.outstandingAmount);
      if (outstanding > principal) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Amount',
          text2: 'Outstanding amount cannot be greater than original loan amount',
          position: 'bottom',
        });
        return;
      }
    }
    
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoadingLoan ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        {/* Edit Mode Information Banner */}
        {isEditMode && (
          <View style={[styles.infoBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoBannerText, { color: colors.text }]}>
              Changing these settings will only apply to future payments. Past transactions remain unchanged.
            </Text>
          </View>
        )}
        
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Loan Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }, isEditMode && { opacity: 0.5 }]}
            placeholder="e.g., Home Loan - SBI"
            placeholderTextColor={colors.textMuted}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            editable={!isEditMode}
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
                  formData.type === type.value && { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
                  isEditMode && { opacity: 0.5 }
                ]}
                onPress={() => setFormData({ ...formData, type: type.value })}
                disabled={isEditMode}
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

        {/* New vs Existing Loan Toggle - only show when adding new loan */}
        {!isEditMode && (
          <View style={[styles.field, styles.toggleField, { marginBottom: 20 }]}>
            <View style={styles.toggleLeft}>
              <Ionicons name="time-outline" size={20} color={colors.text} />
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>Existing Loan</Text>
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  {isExistingLoan 
                    ? 'Track a loan you already have (simplified tracking)'
                    : 'Start tracking a new loan from the beginning'}
                </Text>
              </View>
            </View>
            <Switch
              value={isExistingLoan}
              onValueChange={setIsExistingLoan}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={isExistingLoan ? colors.primary : '#f4f3f4'}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Lender/Bank Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }, isEditMode && { opacity: 0.5 }]}
            placeholder="e.g., State Bank of India"
            placeholderTextColor={colors.textMuted}
            value={formData.lenderName}
            onChangeText={(text) => setFormData({ ...formData, lenderName: text })}
            editable={!isEditMode}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Loan Account Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }, isEditMode && { opacity: 0.5 }]}
            placeholder="Optional"
            placeholderTextColor={colors.textMuted}
            value={formData.loanAccountNumber}
            onChangeText={(text) => setFormData({ ...formData, loanAccountNumber: text })}
            editable={!isEditMode}
          />
        </View>

        {/* For new loans: show Principal Amount */}
        {!isExistingLoan && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Principal Amount (₹) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }, isEditMode && { opacity: 0.5 }]}
              placeholder="e.g., 1000000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={formData.principalAmount}
              onChangeText={(text) => setFormData({ ...formData, principalAmount: text })}
              editable={!isEditMode}
            />
          </View>
        )}

        {/* For existing loans: show Original Loan Amount and Current Outstanding */}
        {isExistingLoan && (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Original Loan Amount (₹) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., 1000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={formData.principalAmount}
                onChangeText={(text) => setFormData({ ...formData, principalAmount: text })}
              />
              <Text style={[styles.helperText, { color: colors.textMuted, marginTop: 4 }]}>
                Total loan amount when you took the loan
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Current Outstanding (₹) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., 750000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={formData.outstandingAmount}
                onChangeText={(text) => setFormData({ ...formData, outstandingAmount: text })}
              />
              <Text style={[styles.helperText, { color: colors.textMuted, marginTop: 4 }]}>
                Remaining amount to be paid as of today
              </Text>
            </View>
          </>
        )}

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
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {isExistingLoan ? 'Remaining Tenure *' : 'Tenure (months) *'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder={isExistingLoan ? 'e.g., 36' : 'e.g., 60'}
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
            disabled={isEditMode}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
            <Text style={[styles.datePickerText, { color: colors.text }]}>
              {startDate.toLocaleDateString('en-US', { 
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={resolvedTheme}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
          />
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Expected End Date</Text>
          <TouchableOpacity
            style={[styles.datePickerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
            <Text style={[styles.datePickerText, { color: endDate ? colors.text : colors.textMuted }]}>
              {endDate ? endDate.toLocaleDateString('en-US', { 
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : 'Auto-calculated from tenure'}
            </Text>
          </TouchableOpacity>
          {endDate && (
            <Text style={[styles.helperText, { color: colors.textMuted, marginTop: 4 }]}>
              Calculated based on {formData.tenure} months tenure
            </Text>
          )}
        </View>

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={resolvedTheme}
            minimumDate={startDate}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
          />
        )}

        {/* Next EMI Date - only for existing loans */}
        {isExistingLoan && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Next EMI Due Date *</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowNextEmiDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text} />
              <Text style={[styles.datePickerText, { color: colors.text }]}>
                {nextEmiDate.toLocaleDateString('en-US', { 
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showNextEmiDatePicker && (
          <DateTimePicker
            value={nextEmiDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={resolvedTheme}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowNextEmiDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setNextEmiDate(selectedDate);
              }
            }}
          />
        )}

        {accounts.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Link to Account (optional)</Text>
            <TouchableOpacity
              style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }, isEditMode && { opacity: 0.5 }]}
              onPress={() => !isEditMode && setShowAccountPicker(!showAccountPicker)}
              disabled={isEditMode}
            >
              <Ionicons name="wallet-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.dropdownText, { color: formData.accountId ? colors.text : colors.textMuted }]}>
                {formData.accountId ? accounts.find(a => a.id.toString() === formData.accountId)?.name : 'Select Account (Optional)'}
              </Text>
              {!isEditMode && (
                <Ionicons name={showAccountPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
            {showAccountPicker && !isEditMode && (
              <View style={[styles.accountDropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.accountDropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => { 
                    setFormData({ ...formData, accountId: '' }); 
                    setShowAccountPicker(false); 
                  }}
                >
                  <Text style={[styles.accountDropdownText, { color: colors.textMuted }]}>
                    None
                  </Text>
                  {!formData.accountId && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
                {accounts.map(account => (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.accountDropdownItem, { borderBottomColor: colors.border }]}
                    onPress={() => { 
                      setFormData({ ...formData, accountId: account.id.toString() }); 
                      setShowAccountPicker(false); 
                    }}
                  >
                    <Text style={[
                      styles.accountDropdownText,
                      { color: colors.text },
                      formData.accountId === account.id.toString() && { fontWeight: '600', color: colors.primary }
                    ]}>
                      {account.name}
                    </Text>
                    {formData.accountId === account.id.toString() && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Payment Settings */}
        {formData.accountId && (
          <>
            <View style={styles.sectionDivider} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Settings</Text>
            
            {/* Create Transaction Toggle */}
            <View style={[styles.field, styles.toggleField]}>
              <View style={styles.toggleLeft}>
                <Ionicons name="receipt-outline" size={20} color={colors.text} />
                <View style={styles.toggleTextContainer}>
                  <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>Create Transaction</Text>
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    Record each EMI payment as a transaction
                  </Text>
                </View>
              </View>
              <Switch
                value={createTransaction}
                onValueChange={setCreateTransaction}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={createTransaction ? colors.primary : '#f4f3f4'}
              />
            </View>

            {/* Affect Balance Toggle */}
            <View style={[styles.field, styles.toggleField]}>
              <View style={styles.toggleLeft}>
                <Ionicons name="wallet-outline" size={20} color={colors.text} />
                <View style={styles.toggleTextContainer}>
                  <Text style={[styles.label, { color: colors.text, marginBottom: 2 }]}>Affect Account Balance</Text>
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    Deduct EMI amount from linked account
                  </Text>
                </View>
              </View>
              <Switch
                value={affectBalance}
                onValueChange={setAffectBalance}
                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                thumbColor={affectBalance ? colors.primary : '#f4f3f4'}
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {(createMutation.isPending || updateMutation.isPending) ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>{isEditMode ? 'Update Loan' : 'Add Loan'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
    flex: 1,
    fontSize: 15,
  },
  accountDropdownList: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 300,
  },
  accountDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 0.5,
  },
  accountDropdownText: {
    fontSize: 15,
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
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  toggleField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
