import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import type { Loan, LoanInstallment } from '../lib/types';
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

interface LoanCardProps {
  loan: Loan;
  colors: ReturnType<typeof getThemedColors>;
  hideBalances: boolean;
  onPress: () => void;
  onDetailsPress: () => void;
  nextInstallment?: LoanInstallment | null;
}

function LoanCard({ loan, colors, hideBalances, onPress, onDetailsPress, nextInstallment }: LoanCardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'outstanding'>('overview');
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const getLoanIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'home_loan': return 'home';
      case 'personal_loan': return 'cash';
      case 'credit_card_loan': return 'card';
      case 'item_emi': return 'cart';
      default: return 'document';
    }
  };

  const getLoanTypeLabel = (type: string) => {
    switch (type) {
      case 'home_loan': return 'HOME LOAN';
      case 'personal_loan': return 'PERSONAL LOAN';
      case 'credit_card_loan': return 'CREDIT CARD';
      case 'item_emi': return 'ITEM EMI';
      default: return type.toUpperCase();
    }
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')} ${MONTH_NAMES[date.getMonth()]}, ${date.getFullYear()}`;
  };

  const formatShortDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  };

  const maskAccountNumber = (accNum: string | null | undefined) => {
    if (!accNum) return 'N/A';
    const last4 = accNum.slice(-4);
    return `****${last4}`;
  };

  const getDisplayAccountNumber = () => {
    if (!loan.loanAccountNumber) return 'N/A';
    if (showAccountNumber) return loan.loanAccountNumber;
    return maskAccountNumber(loan.loanAccountNumber);
  };

  const calculateEndDate = (): string | null => {
    if (loan.endDate) return loan.endDate;
    
    const tenure = loan.tenure || loan.tenureMonths;
    if (!tenure || !loan.startDate) return null;
    
    const startDate = new Date(loan.startDate);
    startDate.setMonth(startDate.getMonth() + tenure);
    return startDate.toISOString();
  };

  const getDisplayPrincipal = (): number => {
    const principal = parseFloat(loan.principalAmount) || 0;
    const outstanding = parseFloat(loan.outstandingAmount) || 0;
    
    // For backward compatibility: if principal is 0 or equals outstanding (old data),
    // use outstanding as the display value (no progress tracking possible)
    if (principal === 0) {
      return outstanding;
    }
    return principal;
  };

  const calculateProgress = (): number => {
    const principal = parseFloat(loan.principalAmount) || 0;
    const outstanding = parseFloat(loan.outstandingAmount) || 0;
    
    // If no principal recorded (old existing loans), show 0% progress
    if (principal <= 0 || principal === outstanding) {
      return 0;
    }
    
    return Math.min(100, Math.max(0, ((principal - outstanding) / principal) * 100));
  };

  const getPrincipalPaid = (): number => {
    const principal = parseFloat(loan.principalAmount) || 0;
    const outstanding = parseFloat(loan.outstandingAmount) || 0;
    
    // If no principal recorded (old existing loans), show 0 paid
    if (principal <= 0 || principal === outstanding) {
      return 0;
    }
    
    return Math.max(0, principal - outstanding);
  };

  const getNextDueDate = (): string | null => {
    if (nextInstallment?.dueDate) {
      return nextInstallment.dueDate;
    }
    if (loan.nextEmiDate) {
      return loan.nextEmiDate;
    }
    return null;
  };

  const getTodayFormatted = (): string => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')} ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
  };

  const displayPrincipal = getDisplayPrincipal();
  const principalPaid = getPrincipalPaid();
  const progress = calculateProgress();
  const endDate = calculateEndDate();

  return (
    <TouchableOpacity 
      style={[styles.loanCard, { backgroundColor: '#1a2744' }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.loanIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.3)' }]}>
            <Ionicons name={getLoanIcon(loan.loanType || '')} size={20} color="#60a5fa" />
          </View>
          <View style={styles.loanTitleContainer}>
            <Text style={styles.loanTypeLabel}>{getLoanTypeLabel(loan.loanType || '')}</Text>
            <Text style={styles.loanPrincipal}>
              {hideBalances ? '****' : formatCurrency(displayPrincipal)}
            </Text>
            <Text style={styles.maturityDate}>
              Matures on {endDate ? formatShortDate(endDate) : 'N/A'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.arrowButton}
          onPress={onDetailsPress}
        >
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outstanding' && styles.activeTab]}
          onPress={() => setActiveTab('outstanding')}
        >
          <Text style={[styles.tabText, activeTab === 'outstanding' && styles.activeTabText]}>
            Outstanding
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'overview' ? (
          <View style={styles.overviewContent}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Loan A/c Number</Text>
                <View style={styles.overviewValueRow}>
                  <Text style={styles.overviewValue}>{getDisplayAccountNumber()}</Text>
                  {loan.loanAccountNumber && (
                    <TouchableOpacity 
                      onPress={() => setShowAccountNumber(!showAccountNumber)}
                      style={styles.eyeButton}
                    >
                      <Ionicons 
                        name={showAccountNumber ? 'eye' : 'eye-off'} 
                        size={14} 
                        color="#60a5fa" 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.overviewItemRight}>
                <Text style={styles.overviewLabel}>Rate of Interest</Text>
                <Text style={styles.overviewValue}>{loan.interestRate}% p.a.</Text>
              </View>
            </View>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Upcoming EMI</Text>
                <Text style={styles.overviewValue}>
                  {hideBalances ? '****' : formatCurrency(parseFloat(loan.emiAmount || '0'))}
                </Text>
              </View>
              <View style={styles.overviewItemRight}>
                <Text style={styles.overviewLabel}>Due On</Text>
                <Text style={[styles.overviewValue, { color: '#60a5fa' }]}>
                  {formatDate(getNextDueDate())}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.outstandingContent}>
            <View style={styles.outstandingRow}>
              <Text style={styles.overviewLabel}>Outstanding Principal</Text>
              <Text style={styles.outstandingAmount}>
                {hideBalances ? '****' : formatCurrency(parseFloat(loan.outstandingAmount))}
              </Text>
            </View>
            <View style={styles.outstandingRow}>
              <Text style={styles.overviewLabel}>Principal Paid</Text>
              <Text style={styles.paidAmount}>
                {hideBalances ? '****' : `${formatCurrency(principalPaid)}/${formatCurrency(displayPrincipal)}`}
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.noteText}>
        Note: Outstanding Principal & Principal Paid is shown as on {getTodayFormatted()}
      </Text>
    </TouchableOpacity>
  );
}

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
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useFocusEffect(
    useCallback(() => {
      return () => {
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

  const handleDelete = (loan: Loan) => {
    setLoanToDelete(loan);
    setDeleteModalVisible(true);
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

  const getLoanTypeLabel = (type: string) => {
    switch (type) {
      case 'home_loan': return 'Home Loan';
      case 'personal_loan': return 'Personal Loan';
      case 'credit_card_loan': return 'Credit Card';
      case 'item_emi': return 'Item EMI';
      default: return type;
    }
  };

  const filterOptions = useMemo(() => {
    if (!loans) return [];
    const types = new Map<string, number>();
    loans.forEach(loan => {
      const type = loan.loanType || 'other';
      types.set(type, (types.get(type) || 0) + 1);
    });
    return Array.from(types.entries()).map(([type, count]) => ({
      key: type,
      label: getLoanTypeLabel(type),
      count
    }));
  }, [loans]);

  const filteredLoans = useMemo(() => {
    if (!loans) return [];
    if (selectedFilter === 'all') return loans;
    return loans.filter(loan => loan.loanType === selectedFilter);
  }, [loans, selectedFilter]);

  const activeLoansCount = loans?.filter(l => l.status === 'active').length || 0;

  const renderLoan = ({ item }: { item: Loan }) => {
    const content = (
      <LoanCard
        loan={item}
        colors={colors}
        hideBalances={hideBalances}
        onPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
        onDetailsPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
      />
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
            if (currentOpenSwipeable.current !== null && currentOpenSwipeable.current !== item.id) {
              swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
            }
            currentOpenSwipeable.current = item.id;
            
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
      <View style={styles.headerSection}>
        <View style={styles.activeLoansRow}>
          <Text style={[styles.activeLoansText, { color: colors.text }]}>
            Active Loans ({activeLoansCount})
          </Text>
          <TouchableOpacity onPress={() => setHideBalances(!hideBalances)}>
            <Ionicons name={hideBalances ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.filterChipActive,
              { borderColor: selectedFilter === 'all' ? colors.primary : colors.border }
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[
              styles.filterChipText,
              { color: selectedFilter === 'all' ? colors.primary : colors.textMuted }
            ]}>
              All Loans ({loans?.length || 0})
            </Text>
          </TouchableOpacity>
          {filterOptions.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterChip,
                selectedFilter === option.key && styles.filterChipActive,
                { borderColor: selectedFilter === option.key ? colors.primary : colors.border }
              ]}
              onPress={() => setSelectedFilter(option.key)}
            >
              <Text style={[
                styles.filterChipText,
                { color: selectedFilter === option.key ? colors.primary : colors.textMuted }
              ]}>
                {option.label} ({option.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
          data={filteredLoans}
          renderItem={renderLoan}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddLoan', {})}
        activeOpacity={0.8}
        accessibilityLabel="Add new loan"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

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
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  activeLoansRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activeLoansText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  loanCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  loanIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanTitleContainer: {
    flex: 1,
  },
  loanTypeLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  loanPrincipal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  maturityDate: {
    fontSize: 11,
    color: '#64748b',
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 80,
  },
  overviewContent: {
    gap: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewItem: {
    flex: 1,
  },
  overviewItemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  overviewLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  overviewValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    marginLeft: 8,
    padding: 4,
  },
  outstandingContent: {
    gap: 8,
  },
  outstandingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outstandingAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  noteText: {
    fontSize: 10,
    color: '#475569',
    marginTop: 12,
    fontStyle: 'italic',
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
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
