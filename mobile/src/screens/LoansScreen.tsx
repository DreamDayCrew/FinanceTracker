import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, Animated } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import type { Loan } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { useSwipeSettings } from '../hooks/useSwipeSettings';

interface LoanSummary {
  totalLoans: number;
  totalOutstanding: number;
  totalEmiThisMonth: number;
  nextEmiDue: { loanName: string; amount: string; dueDate: string } | null;
}

type RootStackParamList = {
  Loans: undefined;
  LoanDetails: { loanId: number };
  AddLoan: { loanId?: number };
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LoansScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const swipeSettings = useSwipeSettings();
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());
  const currentOpenSwipeable = useRef<number | null>(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [hideBalances, setHideBalances] = useState(false);

  // Close all swipeables when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Close all swipeables when leaving screen
        swipeableRefs.current.forEach(ref => ref?.close());
        currentOpenSwipeable.current = null;
      };
    }, [])
  );

  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: () => api.getLoans(),
  });

  const { data: loanSummary } = useQuery<LoanSummary>({
    queryKey: ['loan-summary'],
    queryFn: () => api.getLoanSummary(),
  });

  const deleteMutation = useMutation({
    mutationFn: (loanId: number) => api.deleteLoan(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-summary'] });
      setDeleteModalVisible(false);
      setLoanToDelete(null);
      Toast.show({
        type: 'success',
        text1: 'Loan Deleted',
        text2: 'The loan has been deleted successfully',
        position: 'bottom',
      });
    },
    onError: (error: any) => {
      setDeleteModalVisible(false);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: error.message || 'Could not delete loan',
        position: 'bottom',
      });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  };

  const calculateProgress = (loan: Loan): number => {
    const principal = parseFloat(loan.principalAmount) || 0;
    const outstanding = parseFloat(loan.outstandingAmount) || 0;
    if (principal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((principal - outstanding) / principal) * 100)));
  };

  const getLoanTypeLabel = (type: string) => {
    switch (type) {
      case 'home_loan': return 'Home Loan';
      case 'personal_loan': return 'Personal Loan';
      case 'credit_card_loan': return 'Credit Card';
      case 'item_emi': return 'Item EMI';
      default: return type;
    }
  };

  const getLoanIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'home_loan': return 'home';
      case 'personal_loan': return 'cash';
      case 'credit_card_loan': return 'card';
      case 'item_emi': return 'cart';
      default: return 'document';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.primary;
      case 'closed': return colors.textMuted;
      case 'defaulted': return colors.danger;
      default: return colors.textMuted;
    }
  };

  const handleDelete = (loan: Loan) => {
    setLoanToDelete(loan);
    setDeleteModalVisible(true);
    // Close the swipeable after showing modal
    if (currentOpenSwipeable.current !== null) {
      swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
      currentOpenSwipeable.current = null;
    }
  };

  const confirmDelete = () => {
    if (loanToDelete) {
      deleteMutation.mutate(loanToDelete.id);
    }
  };

  const handleEdit = (loan: Loan) => {
    // Close the swipeable before navigation
    if (currentOpenSwipeable.current !== null) {
      swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
      currentOpenSwipeable.current = null;
    }
    navigation.navigate('AddLoan', { loanId: loan.id });
  };

  const renderRightActions = (loan: Loan) => {
    const action = swipeSettings.rightAction;
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: action === 'edit' ? colors.primary : '#ef4444' }]}
        onPress={() => {
          if (action === 'edit') {
            handleEdit(loan);
          } else {
            handleDelete(loan);
          }
        }}
      >
        <Ionicons name={action === 'edit' ? 'pencil' : 'trash-outline'} size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{action === 'edit' ? 'Edit' : 'Delete'}</Text>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (loan: Loan) => {
    const action = swipeSettings.leftAction;
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: action === 'edit' ? colors.primary : '#ef4444' }]}
        onPress={() => {
          if (action === 'edit') {
            handleEdit(loan);
          } else {
            handleDelete(loan);
          }
        }}
      >
        <Ionicons name={action === 'edit' ? 'pencil' : 'trash-outline'} size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{action === 'edit' ? 'Edit' : 'Delete'}</Text>
      </TouchableOpacity>
    );
  };

  const renderLoan = ({ item }: { item: Loan }) => {
    const progress = calculateProgress(item);
    const statusColor = getStatusColor(item.status);

    const content = (
      <View style={[styles.loanCard, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.loanCardContent}
          onPress={swipeSettings.enabled ? undefined : () => navigation.navigate('LoanDetails', { loanId: item.id })}
          activeOpacity={swipeSettings.enabled ? 1 : 0.7}
          disabled={swipeSettings.enabled}
        >
          <View style={styles.loanHeader}>
            <View style={[styles.loanIcon, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name={getLoanIcon(item.loanType || '')} size={24} color={statusColor} />
            </View>
            <View style={styles.loanInfo}>
              <Text style={[styles.loanName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.loanType, { color: colors.textMuted }]}>{getLoanTypeLabel(item.loanType || '')}</Text>
              {/* Impact Indicators for Loan Payments */}
              <View style={styles.impactContainer}>
                {item.affectBalance && (
                  <View style={[styles.impactBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="wallet-outline" size={10} color={colors.primary} />
                    <Text style={[styles.impactText, { color: colors.primary }]}>Updates Balance</Text>
                  </View>
                )}
                
                {item.createTransaction && (
                  <View style={[styles.impactBadge, { backgroundColor: colors.textMuted + '15' }]}>
                    <Ionicons name="receipt-outline" size={10} color={colors.textMuted} />
                    <Text style={[styles.impactText, { color: colors.textMuted }]}>Creates Txn</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.loanRight}>
              <TouchableOpacity
                onPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
                style={[styles.viewDetailsButton, { backgroundColor: colors.primary + '15' }]}
              >
                <Ionicons name="list-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.loanAmounts}>
                <Text style={[styles.outstandingAmount, { color: colors.text }]}>
                  {hideBalances ? '****' : formatCurrency(parseFloat(item.outstandingAmount))}
                </Text>
                <Text style={[styles.remainingLabel, { color: colors.textMuted }]}>remaining</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>{progress}% paid</Text>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              EMI: {hideBalances ? '****' : formatCurrency(parseFloat(item.emiAmount || '0'))}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );

    if (swipeSettings.enabled) {
      return (
        <Swipeable
          key={item.id}
          ref={(ref) => {
            if (ref) {
              swipeableRefs.current.set(item.id, ref);
            } else {
              swipeableRefs.current.delete(item.id);
            }
          }}
          renderRightActions={() => renderRightActions(item)}
          renderLeftActions={() => renderLeftActions(item)}
          onSwipeableOpen={(direction) => {
            // Close previously opened swipeable
            if (currentOpenSwipeable.current !== null && currentOpenSwipeable.current !== item.id) {
              swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
            }
            currentOpenSwipeable.current = item.id;
            
            // Automatically trigger action based on swipe direction
            const action = direction === 'right' ? swipeSettings.rightAction : swipeSettings.leftAction;
            if (action === 'edit') {
              handleEdit(item);
            } else {
              handleDelete(item);
            }
          }}
        >
          {content}
        </Swipeable>
      );
    }

    return content;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loanSummary && (
        <View style={[styles.summaryCard, { backgroundColor: '#1e293b' }]}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="business" size={20} color="#fff" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Total Outstanding</Text>
              <Text style={styles.summaryAmount}>
                {hideBalances ? '****' : formatCurrency(loanSummary.totalOutstanding)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.hideToggle}
              onPress={() => setHideBalances(!hideBalances)}
            >
              <Ionicons name={hideBalances ? 'eye-off' : 'eye'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Active Loans</Text>
              <Text style={styles.summaryStatValue}>{loanSummary.totalLoans}</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>EMI This Month</Text>
              <Text style={styles.summaryStatValue}>
                {hideBalances ? '****' : formatCurrency(loanSummary.totalEmiThisMonth)}
              </Text>
            </View>
          </View>
          {loanSummary.nextEmiDue && (
            <View style={styles.nextEmiContainer}>
              <Ionicons name="calendar" size={14} color="#fff" />
              <Text style={styles.nextEmiText}>
                Next: {loanSummary.nextEmiDue.loanName} - {formatCurrency(parseFloat(loanSummary.nextEmiDue.amount))} on {formatDate(loanSummary.nextEmiDue.dueDate)}
              </Text>
            </View>
          )}
        </View>
      )}

      {(!loans || loans.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Loans</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Track your home loan, car loan, or EMIs
          </Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          renderItem={renderLoan}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddLoan', {})}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Loan</Text>
      </TouchableOpacity>

      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

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
              This will permanently delete "{loanToDelete?.name}" and all its installments. This action cannot be undone.
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
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Delete</Text>
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hideToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 16,
  },
  summaryStat: {
    flex: 1,
  },
  summaryStatLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  summaryStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  nextEmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  nextEmiText: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  loanCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loanCardContent: {
    padding: 16,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanInfo: {
    flex: 1,
  },
  loanName: {
    fontSize: 16,
    fontWeight: '600',
  },
  loanType: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  loanRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewDetailsButton: {
    padding: 6,
    borderRadius: 6,
  },
  loanAmounts: {
    alignItems: 'flex-end',
  },
  outstandingAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  remainingLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  impactContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    gap: 3,
  },
  impactText: {
    fontSize: 9, // Slightly smaller for the loan card sub-info
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
