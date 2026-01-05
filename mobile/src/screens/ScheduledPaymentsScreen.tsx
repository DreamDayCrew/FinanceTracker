import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch, Modal, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { MoreStackParamList } from '../../App';
import type { ScheduledPayment, PaymentOccurrence, Category, Account } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const FREQUENCY_OPTIONS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Every 3 Months',
  half_yearly: 'Every 6 Months',
  yearly: 'Yearly',
};

export default function ScheduledPaymentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const [activeTab, setActiveTab] = useState<'checklist' | 'manage'>('checklist');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<PaymentOccurrence | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const { data: payments, isLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['scheduled-payments'],
    queryFn: api.getScheduledPayments,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const { data: occurrences = [], refetch: refetchOccurrences } = useQuery<PaymentOccurrence[]>({
    queryKey: ['payment-occurrences', currentMonth, currentYear],
    queryFn: () => api.getPaymentOccurrences(currentMonth, currentYear),
  });

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchPayments();
      refetchOccurrences();
    }, [refetchPayments, refetchOccurrences])
  );

  const generateOccurrencesMutation = useMutation({
    mutationFn: () => api.generatePaymentOccurrences(currentMonth, currentYear),
    onSuccess: () => {
      refetchOccurrences();
    },
  });

  const updateOccurrenceMutation = useMutation({
    mutationFn: async ({ id, status, occurrence }: { id: number; status: string; occurrence?: PaymentOccurrence }) => {
      // If unchecking (changing from paid to pending), delete transaction and restore account balance
      if (status === 'pending' && occurrence) {
        const payment = occurrence.scheduledPayment;
        if (payment) {
          // Find the transaction by description and amount
          const transactionDescription = `Scheduled payment: ${payment.name}`;
          const allTransactions = await api.getTransactions();
          
          // Find the exact transaction (matching description and amount)
          const matchingTransaction = allTransactions.find((t: any) => 
            t.description === transactionDescription && 
            parseFloat(t.amount) === parseFloat(payment.amount) &&
            t.type === 'debit'
          );
          
          if (matchingTransaction) {
            // Delete the transaction
            await api.deleteTransaction(matchingTransaction.id);
            
            // Restore account balance (add back the payment amount)
            if (matchingTransaction.accountId) {
              const account = accounts.find(a => a.id === matchingTransaction.accountId);
              if (account) {
                const newBalance = (parseFloat(account.balance) + parseFloat(payment.amount)).toString();
                await api.updateAccount(matchingTransaction.accountId, { balance: newBalance });
              }
            }
          }
        }
      }
      
      // Update occurrence status
      return await api.updatePaymentOccurrence(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchOccurrences();
      Toast.show({
        type: 'success',
        text1: 'Payment Updated',
        text2: 'Payment status has been updated',
        position: 'bottom',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not update payment. Please try again.',
        position: 'bottom',
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ occurrenceId, accountId, date }: { occurrenceId: number; accountId: number; date: string }) => {
      const occurrence = occurrences.find(o => o.id === occurrenceId);
      if (!occurrence || !occurrence.scheduledPayment) {
        throw new Error('Payment not found');
      }

      // Create transaction
      await api.createTransaction({
        type: 'debit',
        amount: occurrence.scheduledPayment.amount,
        merchant: occurrence.scheduledPayment.name,
        description: `Scheduled payment: ${occurrence.scheduledPayment.name}`,
        categoryId: occurrence.scheduledPayment.categoryId || null,
        accountId,
        transactionDate: date,
        paymentOccurrenceId: occurrenceId,
      });

      // Update occurrence status
      await api.updatePaymentOccurrence(occurrenceId, { status: 'paid' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchOccurrences();
      setShowPaymentModal(false);
      setSelectedOccurrence(null);
      Toast.show({
        type: 'success',
        text1: 'Payment Recorded',
        text2: 'Transaction created and account updated',
        position: 'bottom',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Record Payment',
        text2: error instanceof Error ? error.message : 'Please try again',
        position: 'bottom',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' }) =>
      api.updateScheduledPayment(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('deleteMutation called with id:', id);
      try {
        const result = await api.deleteScheduledPayment(id);
        console.log('Delete API result:', result);
        return result;
      } catch (error) {
        console.error('Delete API error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Delete mutation onSuccess called');
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchPayments();
      refetchOccurrences();
      Toast.show({
        type: 'success',
        text1: 'Payment Deleted',
        text2: 'Scheduled payment has been removed',
        position: 'bottom',
      });
    },
    onError: (error) => {
      console.error('Delete mutation onError:', error);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Could not delete payment. Please try again.',
        position: 'bottom',
      });
    },
  });

  useEffect(() => {
    if (payments && payments.length > 0) {
      generateOccurrencesMutation.mutate();
    }
  }, [payments?.length, currentMonth, currentYear]);

  const handleDelete = (payment: ScheduledPayment) => {
    console.log('Delete button clicked for payment:', payment.id, payment.name);
    
    // Directly call the mutation to test
    console.log('About to call deleteMutation.mutate with id:', payment.id);
    deleteMutation.mutate(payment.id);
    
    /* Original alert version - uncomment if you want confirmation dialog
    Alert.alert(
      'Delete Payment',
      `Delete "${payment.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            console.log('Confirmed delete for:', payment.id);
            deleteMutation.mutate(payment.id);
          }
        },
      ]
    );
    */
  };

  const toggleStatus = (payment: ScheduledPayment) => {
    updateMutation.mutate({
      id: payment.id,
      status: payment.status === 'active' ? 'inactive' : 'active',
    });
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleMarkAsPaid = (occurrence: PaymentOccurrence) => {
    setSelectedOccurrence(occurrence);
    setPaymentDate(new Date());
    setSelectedAccountId(accounts.length > 0 ? accounts[0].id : null);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedOccurrence || !selectedAccountId) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please select an account',
        position: 'bottom',
      });
      return;
    }

    markAsPaidMutation.mutate({
      occurrenceId: selectedOccurrence.id,
      accountId: selectedAccountId,
      date: paymentDate.toISOString(),
    });
  };

  const activePayments = payments?.filter(p => p.status === 'active') || [];
  const totalMonthly = activePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  const paidOccurrences = occurrences.filter(o => o.status === 'paid');
  const pendingOccurrences = occurrences.filter(o => o.status === 'pending');
  const totalPaid = paidOccurrences.reduce((sum, o) => sum + parseFloat(o.scheduledPayment?.amount || '0'), 0);
  const totalPending = pendingOccurrences.reduce((sum, o) => sum + parseFloat(o.scheduledPayment?.amount || '0'), 0);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Monthly Payment Checklist</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {activePayments.length} active payments
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddScheduledPayment')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'checklist' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('checklist')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'checklist' ? colors.primary : colors.textMuted }]}>
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'manage' ? colors.primary : colors.textMuted }]}>
            All Payments
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'checklist' ? (
          <View style={styles.tabContent}>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthText, { color: colors.text }]}>
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
                <Ionicons name="chevron-forward" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                <Text style={styles.summaryLabel}>Paid</Text>
                <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
                  {formatCurrency(totalPaid)}
                </Text>
                <Text style={styles.summaryCount}>{paidOccurrences.length} items</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#fed7aa', borderColor: '#fdba74' }]}>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={[styles.summaryValue, { color: '#ea580c' }]}>
                  {formatCurrency(totalPending)}
                </Text>
                <Text style={styles.summaryCount}>{pendingOccurrences.length} items</Text>
              </View>
            </View>

            {/* Checklist */}
            {occurrences.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No payments due this month</Text>
                <TouchableOpacity
                  style={[styles.generateButton, { borderColor: colors.border }]}
                  onPress={() => generateOccurrencesMutation.mutate()}
                >
                  <Text style={[styles.generateButtonText, { color: colors.text }]}>Generate Checklist</Text>
                </TouchableOpacity>
              </View>
            ) : (
              occurrences.map((occurrence) => {
                const payment = occurrence.scheduledPayment;
                const isPaid = occurrence.status === 'paid';
                const category = categories.find(c => c.id === payment?.categoryId);
                const dueDate = new Date(occurrence.dueDate);
                const isPastDue = !isPaid && dueDate < new Date();

                return (
                  <View 
                    key={occurrence.id} 
                    style={[
                      styles.checklistItem, 
                      { backgroundColor: colors.card },
                      isPaid && styles.checklistItemPaid,
                      isPastDue && { borderColor: '#ef4444', borderWidth: 1 }
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        if (isPaid) {
                          updateOccurrenceMutation.mutate({
                            id: occurrence.id,
                            status: 'pending',
                            occurrence: occurrence,
                          });
                        } else {
                          handleMarkAsPaid(occurrence);
                        }
                      }}
                      style={styles.checkbox}
                      disabled={updateOccurrenceMutation.isPending}
                    >
                      <View style={[
                        styles.checkboxInner,
                        { borderColor: colors.border },
                        isPaid && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}>
                        {isPaid && <Ionicons name="checkmark" size={18} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.checklistInfo}>
                      <View style={styles.checklistHeader}>
                        <Text style={[
                          styles.checklistName, 
                          { color: colors.text },
                          isPaid && { textDecorationLine: 'line-through', color: colors.textMuted }
                        ]}>
                          {payment?.name}
                        </Text>
                        {isPastDue && (
                          <View style={styles.overdueBadge}>
                            <Text style={styles.overdueText}>Overdue</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.checklistDue, { color: colors.textMuted }]}>
                        Due {dueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        {category && ` • ${category.name}`}
                        {payment?.frequency && payment.frequency !== 'monthly' && (
                          <Text style={{ color: colors.primary }}>
                            {' '}• {FREQUENCY_OPTIONS[payment.frequency] || payment.frequency}
                          </Text>
                        )}
                      </Text>
                    </View>
                    <Text style={[
                      styles.checklistAmount, 
                      { color: isPaid ? colors.textMuted : '#ef4444' }
                    ]}>
                      {formatCurrency(parseFloat(payment?.amount || '0'))}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* Total Card */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Monthly Commitment</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalMonthly)}</Text>
            </View>

            {/* Payments List */}
            {payments && payments.length > 0 ? (
              payments.map((payment) => {
                const category = categories.find(c => c.id === payment.categoryId);
                const isActive = payment.status === 'active';

                return (
                  <View
                    key={payment.id} 
                    style={[
                      styles.paymentCard,
                      { backgroundColor: colors.card },
                      !isActive && styles.paymentCardInactive
                    ]}
                  >
                    <View style={styles.paymentInfo}>
                      <View style={styles.paymentHeader}>
                        <Text style={[styles.paymentName, { color: colors.text }, !isActive && { color: colors.textMuted }]}>
                          {payment.name}
                        </Text>
                        <View style={[styles.frequencyBadge, { backgroundColor: `${colors.primary}20` }]}>
                          <Text style={[styles.frequencyText, { color: colors.primary }]}>
                            {FREQUENCY_OPTIONS[payment.frequency || 'monthly'] || 'Monthly'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.paymentDue, { color: colors.textMuted }]}>
                        Due on {payment.dueDate}th
                        {category && ` • ${category.name}`}
                      </Text>
                      {payment.notes && (
                        <Text style={[styles.paymentNotes, { color: colors.textMuted }]}>{payment.notes}</Text>
                      )}
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={[styles.paymentAmount, { color: colors.text }, !isActive && { color: colors.textMuted }]}>
                        {formatCurrency(parseFloat(payment.amount))}
                      </Text>
                      <View style={styles.paymentActions}>
                        <Switch
                          value={isActive}
                          onValueChange={() => toggleStatus(payment)}
                          trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                          thumbColor={isActive ? colors.primary : colors.textMuted}
                        />
                        <TouchableOpacity 
                          onPress={() => {
                            console.log('Delete button pressed!');
                            handleDelete(payment);
                          }}
                          style={[styles.deleteButton, { backgroundColor: '#fee2e2', borderRadius: 8 }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No scheduled payments yet</Text>
                <TouchableOpacity
                  style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('AddScheduledPayment')}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addFirstButtonText}>Add Your First Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Confirmation Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.paymentModalLabel, { color: colors.textMuted }]}>Payment Details</Text>
              <Text style={[styles.paymentModalName, { color: colors.text }]}>
                {selectedOccurrence?.scheduledPayment?.name}
              </Text>
              <Text style={[styles.paymentModalAmount, { color: colors.primary }]}>
                {formatCurrency(parseFloat(selectedOccurrence?.scheduledPayment?.amount || '0'))}
              </Text>

              <View style={styles.modalField}>
                <Text style={[styles.modalFieldLabel, { color: colors.textMuted }]}>Payment Date</Text>
                <TouchableOpacity 
                  style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.dateButtonText, { color: colors.text }]}>
                    {paymentDate.toLocaleDateString('en-US', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={paymentDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setPaymentDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              <View style={styles.modalField}>
                <Text style={[styles.modalFieldLabel, { color: colors.textMuted }]}>Pay From Account</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.accountRow}>
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.accountChip,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          selectedAccountId === account.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setSelectedAccountId(account.id)}
                      >
                        <Ionicons 
                          name={account.type === 'bank' ? 'business-outline' : 'card-outline'} 
                          size={16} 
                          color={selectedAccountId === account.id ? '#fff' : colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[
                          styles.accountChipText,
                          { color: colors.text },
                          selectedAccountId === account.id && { color: '#fff' }
                        ]}>
                          {account.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: colors.primary }, markAsPaidMutation.isPending && styles.confirmButtonDisabled]} 
                onPress={handleConfirmPayment}
                disabled={markAsPaidMutation.isPending}
              >
                {markAsPaidMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthNavButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  checklistItemPaid: {
    opacity: 0.6,
  },
  checkbox: {
    padding: 4,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistInfo: {
    flex: 1,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  checklistName: {
    fontSize: 15,
    fontWeight: '500',
  },
  overdueBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  checklistDue: {
    fontSize: 12,
    marginTop: 2,
  },
  checklistAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalCard: {
    backgroundColor: '#f97316',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  paymentCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  paymentCardInactive: {
    opacity: 0.6,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '500',
  },
  frequencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  frequencyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  paymentDue: {
    fontSize: 12,
    marginTop: 4,
  },
  paymentNotes: {
    fontSize: 12,
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  generateButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addFirstButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  paymentModalLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  paymentModalName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentModalAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  modalField: {
    marginBottom: 20,
  },
  modalFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 15,
  },
  accountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
