import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Loan, LoanInstallment, LoanTerm, LoanPayment } from '../lib/types';

type RouteParams = {
  LoanDetails: {
    loanId: number;
  };
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LoanDetailsScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'LoanDetails'>>();
  const queryClient = useQueryClient();
  const { loanId } = route.params;

  const [activeTab, setActiveTab] = useState<'upcoming' | 'paid' | 'terms' | 'payments'>('upcoming');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addTermModalVisible, setAddTermModalVisible] = useState(false);
  const [addPaymentModalVisible, setAddPaymentModalVisible] = useState(false);
  const [processingInstallmentId, setProcessingInstallmentId] = useState<number | null>(null);
  const [newTerm, setNewTerm] = useState({ interestRate: '', tenureMonths: '', emiAmount: '', reason: '' });
  const [newPayment, setNewPayment] = useState({ amount: '', principalPaid: '', interestPaid: '', paymentType: 'emi' as 'emi' | 'prepayment' | 'partial', notes: '' });

  const { data: loan, isLoading } = useQuery<Loan>({
    queryKey: ['loan', loanId],
    queryFn: () => api.getLoan(loanId),
  });

  const { data: installments = [] } = useQuery<LoanInstallment[]>({
    queryKey: ['loan-installments', loanId],
    queryFn: () => api.getLoanInstallments(loanId),
    enabled: !!loan,
  });

  const { data: terms = [] } = useQuery<LoanTerm[]>({
    queryKey: ['loan-terms', loanId],
    queryFn: () => api.getLoanTerms(loanId),
    enabled: !!loan,
  });

  const { data: payments = [] } = useQuery<LoanPayment[]>({
    queryKey: ['loan-payments', loanId],
    queryFn: () => api.getLoanPayments(loanId),
    enabled: !!loan,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteLoan(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-summary'] });
      Toast.show({
        type: 'success',
        text1: 'Loan Deleted',
        text2: 'The loan has been deleted successfully',
        position: 'bottom',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: error.message || 'Could not delete loan',
        position: 'bottom',
      });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ installmentId, amount }: { installmentId: number; amount: string }) => {
      setProcessingInstallmentId(installmentId);      
      return api.markInstallmentPaid(loanId, installmentId, {
        paidDate: new Date().toISOString().split('T')[0],
        paidAmount: amount,
        accountId: loan?.accountId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-installments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setProcessingInstallmentId(null);
      Toast.show({
        type: 'success',
        text1: 'EMI Marked as Paid',
        text2: 'The installment has been marked as paid',
        position: 'bottom',
      });
    },
    onError: (error: any) => {
      setProcessingInstallmentId(null);
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: error.message || 'Could not mark as paid',
        position: 'bottom',
      });
    },
  });

  const addTermMutation = useMutation({
    mutationFn: async (data: { interestRate: string; tenureMonths: string; emiAmount: string; reason: string }) => {
      return api.createLoanTerm(loanId, {
        effectiveFrom: new Date().toISOString().split('T')[0],
        interestRate: data.interestRate,
        tenureMonths: parseInt(data.tenureMonths),
        emiAmount: data.emiAmount,
        outstandingAtChange: loan?.outstandingAmount || '0',
        reason: data.reason || undefined,
        notes: undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-terms', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      setAddTermModalVisible(false);
      setNewTerm({ interestRate: '', tenureMonths: '', emiAmount: '', reason: '' });
      Toast.show({
        type: 'success',
        text1: 'Term Added',
        text2: 'New loan term has been recorded',
        position: 'bottom',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: error.message || 'Could not add term',
        position: 'bottom',
      });
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (data: { amount: string; principalPaid: string; interestPaid: string; paymentType: string; notes: string }) => {
      return api.createLoanPayment(loanId, {
        paymentDate: new Date().toISOString().split('T')[0],
        amount: data.amount,
        principalPaid: data.principalPaid || '0',
        interestPaid: data.interestPaid || '0',
        paymentType: data.paymentType as 'emi' | 'prepayment' | 'partial',
        notes: data.notes || undefined,
        installmentId: undefined,
        accountId: undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-payments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-summary'] });
      setAddPaymentModalVisible(false);
      setNewPayment({ amount: '', principalPaid: '', interestPaid: '', paymentType: 'emi', notes: '' });
      Toast.show({
        type: 'success',
        text1: 'Payment Recorded',
        text2: 'Payment has been added to history',
        position: 'bottom',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: error.message || 'Could not record payment',
        position: 'bottom',
      });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  };

  const calculateProgress = () => {
    if (!loan) return 0;
    const principal = parseFloat(loan.principalAmount) || 0;
    const outstanding = parseFloat(loan.outstandingAmount) || 0;
    if (principal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((principal - outstanding) / principal) * 100)));
  };

  const getUpcomingInstallments = () => {
    const now = new Date();
    return installments
      .filter(i => i.status === 'pending' && new Date(i.dueDate) >= now)
      .slice(0, 6);
  };

  const getPaidInstallments = () => {
    return installments
      .filter(i => i.status === 'paid')
      .reverse()
      .slice(0, 12);
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    setDeleteModalVisible(false);
    deleteMutation.mutate();
  };

  if (isLoading || !loan) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const progress = calculateProgress();
  const upcomingInstallments = getUpcomingInstallments();
  const paidInstallments = getPaidInstallments();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Outstanding Card */}
        <View style={[styles.outstandingCard, { backgroundColor: colors.danger }]}>
          <View style={styles.outstandingContent}>
            <View>
              <Text style={styles.outstandingLabel}>Outstanding</Text>
              <Text style={styles.outstandingAmount}>
                {formatCurrency(parseFloat(loan.outstandingAmount))}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.typeBadgeText}>
                {(loan.loanType || (loan as any).type || '').replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#fff' }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>{progress}% repaid</Text>
              <Text style={styles.progressText}>of {formatCurrency(parseFloat(loan.principalAmount))}</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Monthly EMI</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(parseFloat(loan.emiAmount || '0'))}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Interest Rate</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{loan.interestRate}%</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tenure</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{loan.tenure || loan.tenureMonths} months</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>EMI Date</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{loan.emiDay || '-'}th</Text>
          </View>
        </View>

        {/* Lender Info */}
        {loan.lenderName && (
          <View style={[styles.lenderCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.lenderLabel, { color: colors.textMuted }]}>Lender</Text>
            <Text style={[styles.lenderName, { color: colors.text }]}>{loan.lenderName}</Text>
            {loan.loanAccountNumber && (
              <Text style={[styles.accountNumber, { color: colors.textMuted }]}>
                Account: ****{loan.loanAccountNumber.slice(-4)}
              </Text>
            )}
          </View>
        )}

        {/* Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsContainer}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'upcoming' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'upcoming' ? colors.primary : colors.textMuted }]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'paid' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab('paid')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'paid' ? colors.primary : colors.textMuted }]}>
              Paid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'terms' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab('terms')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'terms' ? colors.primary : colors.textMuted }]}>
              Terms
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'payments' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setActiveTab('payments')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'payments' ? colors.primary : colors.textMuted }]}>
              Payments
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'upcoming' && (
            <>
              {upcomingInstallments.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No upcoming installments</Text>
                </View>
              ) : (
                upcomingInstallments.map((installment) => {
                  const isPending = new Date(installment.dueDate) < new Date();
                  return (
                    <View
                      key={installment.id}
                      style={[
                        styles.installmentCard,
                        { backgroundColor: isPending ? colors.danger + '20' : colors.card }
                      ]}
                    >
                      <View style={styles.installmentLeft}>
                        <Ionicons
                          name={isPending ? 'alert-circle' : 'time'}
                          size={20}
                          color={isPending ? colors.danger : colors.primary}
                        />
                        <View style={styles.installmentInfo}>
                          <Text style={[styles.installmentNumber, { color: colors.text }]}>
                            EMI #{installment.installmentNumber}
                          </Text>
                          <Text style={[styles.installmentDate, { color: colors.textMuted }]}>
                            {formatDate(installment.dueDate)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.installmentRight}>
                        <View style={styles.installmentAmounts}>
                          <Text style={[styles.installmentAmount, { color: colors.text }]}>
                            {formatCurrency(parseFloat(installment.emiAmount))}
                          </Text>
                          <Text style={[styles.installmentBreakdown, { color: colors.textMuted }]}>
                            P: {formatCurrency(parseFloat((installment as any).principalAmount || '0'))} | 
                            I: {formatCurrency(parseFloat((installment as any).interestAmount || '0'))}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.payButton, { backgroundColor: colors.primary }]}
                          onPress={() => markPaidMutation.mutate({ installmentId: installment.id, amount: installment.emiAmount })}
                          disabled={processingInstallmentId === installment.id}
                        >
                          {processingInstallmentId === installment.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.payButtonText}>Pay</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'paid' && (
            <>
              {paidInstallments.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No paid installments yet</Text>
                </View>
              ) : (
                paidInstallments.map((installment) => (
                  <View
                    key={installment.id}
                    style={[styles.installmentCard, { backgroundColor: colors.primary + '20' }]}
                  >
                    <View style={styles.installmentLeft}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      <View style={styles.installmentInfo}>
                        <Text style={[styles.installmentNumber, { color: colors.text }]}>
                          EMI #{installment.installmentNumber}
                        </Text>
                        <Text style={[styles.installmentDate, { color: colors.textMuted }]}>
                          Paid on {formatDate(installment.paidDate || installment.dueDate)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.installmentAmount, { color: colors.text }]}>
                      {formatCurrency(parseFloat(installment.paidAmount || installment.emiAmount))}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'terms' && (
            <>
              <TouchableOpacity
                style={[styles.addRowButton, { backgroundColor: colors.primary }]}
                onPress={() => setAddTermModalVisible(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addRowButtonText}>Record Term Change</Text>
              </TouchableOpacity>
              {terms.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No term changes recorded</Text>
                </View>
              ) : (
                terms.slice().reverse().map((term, index) => (
                  <View
                    key={term.id}
                    style={[styles.termCard, { backgroundColor: index === 0 ? colors.primary + '20' : colors.card }]}
                  >
                    <View style={styles.termHeader}>
                      <View style={[styles.termIcon, { backgroundColor: index === 0 ? colors.primary : colors.textMuted }]}>
                        <Ionicons name="document-text" size={16} color="#fff" />
                      </View>
                      <View style={styles.termInfo}>
                        <Text style={[styles.termLabel, { color: colors.text }]}>
                          {index === 0 ? 'Current Term' : `Term ${terms.length - index}`}
                        </Text>
                        <Text style={[styles.termDate, { color: colors.textMuted }]}>
                          From {formatDate(term.effectiveFrom)}
                          {term.effectiveTo && ` to ${formatDate(term.effectiveTo)}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.termDetails}>
                      <View style={styles.termStat}>
                        <Text style={[styles.termStatLabel, { color: colors.textMuted }]}>Rate</Text>
                        <Text style={[styles.termStatValue, { color: colors.text }]}>{term.interestRate}%</Text>
                      </View>
                      <View style={styles.termStat}>
                        <Text style={[styles.termStatLabel, { color: colors.textMuted }]}>Tenure</Text>
                        <Text style={[styles.termStatValue, { color: colors.text }]}>{term.tenureMonths} mo</Text>
                      </View>
                      <View style={styles.termStat}>
                        <Text style={[styles.termStatLabel, { color: colors.textMuted }]}>EMI</Text>
                        <Text style={[styles.termStatValue, { color: colors.text }]}>{formatCurrency(parseFloat(term.emiAmount))}</Text>
                      </View>
                    </View>
                    {term.reason && (
                      <Text style={[styles.termReason, { color: colors.textMuted }]}>
                        Reason: {term.reason}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <TouchableOpacity
                style={[styles.addRowButton, { backgroundColor: colors.primary }]}
                onPress={() => setAddPaymentModalVisible(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addRowButtonText}>Record Payment</Text>
              </TouchableOpacity>
              {payments.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No payments recorded</Text>
                </View>
              ) : (
                payments.slice().reverse().map((payment) => (
                  <View
                    key={payment.id}
                    style={[styles.paymentCard, { backgroundColor: colors.card }]}
                  >
                    <View style={styles.paymentHeader}>
                      <View style={[styles.paymentIcon, { backgroundColor: payment.paymentType === 'prepayment' ? colors.warning : colors.primary }]}>
                        <Ionicons 
                          name={payment.paymentType === 'prepayment' ? 'flash' : payment.paymentType === 'partial' ? 'pie-chart' : 'wallet'} 
                          size={16} 
                          color="#fff" 
                        />
                      </View>
                      <View style={styles.paymentInfo}>
                        <Text style={[styles.paymentType, { color: colors.text }]}>
                          {payment.paymentType === 'emi' ? 'EMI Payment' : payment.paymentType === 'prepayment' ? 'Prepayment' : 'Partial Payment'}
                        </Text>
                        <Text style={[styles.paymentDate, { color: colors.textMuted }]}>
                          {formatDate(payment.paymentDate)}
                        </Text>
                      </View>
                      <Text style={[styles.paymentAmount, { color: colors.text }]}>
                        {formatCurrency(parseFloat(payment.amount))}
                      </Text>
                    </View>
                    <View style={styles.paymentBreakdown}>
                      <Text style={[styles.paymentBreakdownText, { color: colors.textMuted }]}>
                        Principal: {formatCurrency(parseFloat(payment.principalPaid || '0'))} | Interest: {formatCurrency(parseFloat(payment.interestPaid || '0'))}
                      </Text>
                    </View>
                    {payment.notes && (
                      <Text style={[styles.paymentNotes, { color: colors.textMuted }]}>
                        {payment.notes}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Ionicons name="warning" size={48} color={colors.danger} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Loan?</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              This will permanently delete this loan and all its installments. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.danger }]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Term Modal */}
      <Modal
        visible={addTermModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddTermModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.formModalTitle, { color: colors.text }]}>Record Term Change</Text>
            <Text style={[styles.formModalSubtitle, { color: colors.textMuted }]}>
              Record a change in interest rate, tenure, or EMI
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Interest Rate (%)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., 8.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={newTerm.interestRate}
                onChangeText={(text) => setNewTerm({ ...newTerm, interestRate: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Tenure (months)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., 240"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={newTerm.tenureMonths}
                onChangeText={(text) => setNewTerm({ ...newTerm, tenureMonths: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>New EMI Amount</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., 25000"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={newTerm.emiAmount}
                onChangeText={(text) => setNewTerm({ ...newTerm, emiAmount: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Reason (optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Rate revision by bank"
                placeholderTextColor={colors.textMuted}
                value={newTerm.reason}
                onChangeText={(text) => setNewTerm({ ...newTerm, reason: text })}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={() => setAddTermModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={() => addTermMutation.mutate(newTerm)}
                disabled={addTermMutation.isPending || !newTerm.interestRate || !newTerm.tenureMonths || !newTerm.emiAmount}
              >
                {addTermMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        visible={addPaymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.formModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.formModalTitle, { color: colors.text }]}>Record Payment</Text>
            <Text style={[styles.formModalSubtitle, { color: colors.textMuted }]}>
              Record a payment outside of the regular EMI schedule
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Payment Type</Text>
              <View style={styles.paymentTypeRow}>
                {(['emi', 'prepayment', 'partial'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.paymentTypeButton,
                      { backgroundColor: newPayment.paymentType === type ? colors.primary : colors.background, borderColor: colors.border }
                    ]}
                    onPress={() => setNewPayment({ ...newPayment, paymentType: type })}
                  >
                    <Text style={{ color: newPayment.paymentType === type ? '#fff' : colors.text, fontSize: 12 }}>
                      {type === 'emi' ? 'EMI' : type === 'prepayment' ? 'Prepayment' : 'Partial'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Total Amount</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., 25000"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={newPayment.amount}
                onChangeText={(text) => setNewPayment({ ...newPayment, amount: text })}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Principal</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={newPayment.principalPaid}
                  onChangeText={(text) => setNewPayment({ ...newPayment, principalPaid: text })}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Interest</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={newPayment.interestPaid}
                  onChangeText={(text) => setNewPayment({ ...newPayment, interestPaid: text })}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Extra payment to reduce tenure"
                placeholderTextColor={colors.textMuted}
                value={newPayment.notes}
                onChangeText={(text) => setNewPayment({ ...newPayment, notes: text })}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={() => setAddPaymentModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={() => addPaymentMutation.mutate(newPayment)}
                disabled={addPaymentMutation.isPending || !newPayment.amount}
              >
                {addPaymentMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Save</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outstandingCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  outstandingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  outstandingLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 4,
  },
  outstandingAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  lenderCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lenderLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  lenderName: {
    fontSize: 16,
    fontWeight: '500',
  },
  accountNumber: {
    fontSize: 14,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
    gap: 8,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  installmentCard: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  installmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  installmentInfo: {
    flex: 1,
  },
  installmentNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  installmentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  installmentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installmentAmounts: {
    alignItems: 'flex-end',
  },
  installmentAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  installmentBreakdown: {
    fontSize: 10,
    marginTop: 2,
  },
  payButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsScrollView: {
    marginHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  addRowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  termCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  termIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termInfo: {
    flex: 1,
  },
  termLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  termDate: {
    fontSize: 11,
    marginTop: 2,
  },
  termDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  termStat: {
    flex: 1,
  },
  termStatLabel: {
    fontSize: 10,
  },
  termStatValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  termReason: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  paymentCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentType: {
    fontSize: 14,
    fontWeight: '500',
  },
  paymentDate: {
    fontSize: 11,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  paymentBreakdownText: {
    fontSize: 11,
  },
  paymentNotes: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  formModalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  formModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  formModalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
