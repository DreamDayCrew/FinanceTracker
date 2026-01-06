import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { Loan, LoanInstallment } from '../lib/types';

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

  const [activeTab, setActiveTab] = useState<'upcoming' | 'paid'>('upcoming');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const { data: loan, isLoading } = useQuery<Loan>({
    queryKey: ['loan', loanId],
    queryFn: () => api.getLoan(loanId),
  });

  const { data: installments = [] } = useQuery<LoanInstallment[]>({
    queryKey: ['loan-installments', loanId],
    queryFn: () => api.getLoanInstallments(loanId),
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
      return api.markInstallmentPaid(loanId, installmentId, {
        paidDate: new Date().toISOString().split('T')[0],
        paidAmount: amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-installments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-summary'] });
      Toast.show({
        type: 'success',
        text1: 'EMI Marked as Paid',
        text2: 'The installment has been marked as paid',
        position: 'bottom',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: error.message || 'Could not mark as paid',
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
        <View style={styles.tabsContainer}>
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
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'upcoming' ? (
            upcomingInstallments.length === 0 ? (
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
                          P: {formatCurrency(parseFloat(installment.principalComponent || '0'))} | 
                          I: {formatCurrency(parseFloat(installment.interestComponent || '0'))}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.payButton, { backgroundColor: colors.primary }]}
                        onPress={() => markPaidMutation.mutate({ installmentId: installment.id, amount: installment.emiAmount })}
                        disabled={markPaidMutation.isPending}
                      >
                        <Text style={styles.payButtonText}>Pay</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )
          ) : (
            paidInstallments.length === 0 ? (
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
            )
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.danger }]}
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Loan</Text>
            </>
          )}
        </TouchableOpacity>

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
    marginHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
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
});
