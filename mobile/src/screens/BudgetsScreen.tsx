import { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Swipeable } from 'react-native-gesture-handler';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { MoreStackParamList } from '../../App';
import type { Budget } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { useSwipeSettings } from '../hooks/useSwipeSettings';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function BudgetsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const swipeSettings = useSwipeSettings();
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());
  const currentOpenSwipeable = useRef<number | null>(null);
  
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

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

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => api.getBudgets(month, year),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', month, year],
    queryFn: api.getTransactions,
  });

  // Calculate spending per category for the current month
  const categorySpending = useMemo(() => {
    const spending: Record<number, number> = {};
    
    transactions.forEach((transaction: any) => {
      if (transaction.type === 'debit' && transaction.categoryId) {
        const transactionDate = new Date(transaction.transactionDate);
        if (transactionDate.getMonth() + 1 === month && transactionDate.getFullYear() === year) {
          spending[transaction.categoryId] = (spending[transaction.categoryId] || 0) + parseFloat(transaction.amount);
        }
      }
    });
    
    return spending;
  }, [transactions, month, year]);

  const deleteMutation = useMutation({
    mutationFn: api.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDeleteModalOpen(false);
      setBudgetToDelete(null);
      Toast.show({
        type: 'success',
        text1: 'Budget Deleted',
        text2: 'Budget has been removed successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Could not delete budget. Please try again.',
        position: 'bottom',
      });
    },
  });


  const handleEdit = (budget: Budget) => {
    // Close the swipeable before navigation
    if (currentOpenSwipeable.current !== null) {
      swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
      currentOpenSwipeable.current = null;
    }
    navigation.navigate('AddBudget', { budgetId: budget.id });
  };

  const handleDelete = (budget: Budget) => {
    setBudgetToDelete(budget);
    setIsDeleteModalOpen(true);
    // Close the swipeable after showing modal
    if (currentOpenSwipeable.current !== null) {
      swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
      currentOpenSwipeable.current = null;
    }
  };

  const confirmDelete = () => {
    if (budgetToDelete) {
      deleteMutation.mutate(budgetToDelete.id);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setBudgetToDelete(null);
  };

  const renderRightActions = (budget: Budget) => {
    const action = swipeSettings.rightAction;
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: action === 'edit' ? colors.primary : '#ef4444' }]}
        onPress={() => action === 'edit' ? handleEdit(budget) : handleDelete(budget)}
      >
        <Ionicons name={action === 'edit' ? 'pencil' : 'trash-outline'} size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{action === 'edit' ? 'Edit' : 'Delete'}</Text>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (budget: Budget) => {
    const action = swipeSettings.leftAction;
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: action === 'edit' ? colors.primary : '#ef4444' }]}
        onPress={() => action === 'edit' ? handleEdit(budget) : handleDelete(budget)}
      >
        <Ionicons name={action === 'edit' ? 'pencil' : 'trash-outline'} size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{action === 'edit' ? 'Edit' : 'Delete'}</Text>
      </TouchableOpacity>
    );
  };

  const renderBudgetCard = (budget: Budget) => {
    const spent = budget.categoryId ? (categorySpending[budget.categoryId] || 0) : 0;
    const budgetAmount = parseFloat(budget.amount);
    const percentage = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
    const isOverBudget = spent > budgetAmount;

    const handleCardPress = () => {
      // Close any open swipeable first
      if (currentOpenSwipeable.current !== null) {
        swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
        currentOpenSwipeable.current = null;
      }
      
      // Navigate to category transactions
      if (budget.categoryId && budget.category?.name) {
        navigation.navigate('CategoryTransactions', {
          categoryId: budget.categoryId,
          categoryName: budget.category.name,
          month,
          year,
        });
      }
    };

    const content = (
      <TouchableOpacity
        style={[styles.budgetCard, { backgroundColor: colors.card }]}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <View style={styles.budgetContent}>
          <View style={styles.budgetHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.categoryName, { color: colors.primary }]}>{budget.category?.name || 'Unknown Category'}</Text>
            </View>
            <View style={styles.budgetHeaderRight}>
              {/* Show action buttons on web when swipe is not available */}
              {Platform.OS === 'web' && (
                <View style={styles.webActionButtons}>
                  <TouchableOpacity
                    onPress={() => handleEdit(budget)}
                    style={[styles.webActionButton, { backgroundColor: colors.primary + '15' }]}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(budget)}
                    style={[styles.webActionButton, { backgroundColor: '#ef444415' }]}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  if (budget.categoryId && budget.category?.name) {
                    navigation.navigate('CategoryTransactions', {
                      categoryId: budget.categoryId,
                      categoryName: budget.category.name,
                      month,
                      year,
                    });
                  }
                }}
                style={[styles.viewTransactionsButton, { backgroundColor: colors.primary + '15' }]}
              >
                <Ionicons name="list-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.budgetAmount, { color: colors.text }]}>{formatCurrency(budget.amount)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[
              styles.progressFill, 
              { 
                width: `${percentage}%`, 
                backgroundColor: isOverBudget ? '#ef4444' : colors.primary 
              }
            ]} />
          </View>
          <Text style={[styles.progressText, { color: isOverBudget ? '#ef4444' : colors.textMuted }]}>
            {formatCurrency(spent)} spent {isOverBudget && '(Over budget!)'}
          </Text>
        </View>
      </TouchableOpacity>
    );

    // Disable swipe on web as react-native-gesture-handler doesn't support it
    const isSwipeEnabled = swipeSettings.enabled && Platform.OS !== 'web';
    
    if (isSwipeEnabled) {
      return (
        <Swipeable
          key={budget.id}
          ref={(ref) => {
            if (ref) {
              swipeableRefs.current.set(budget.id, ref);
            } else {
              swipeableRefs.current.delete(budget.id);
            }
          }}
          renderRightActions={() => renderRightActions(budget)}
          renderLeftActions={() => renderLeftActions(budget)}
          onSwipeableOpen={() => {
            // Close previously opened swipeable
            if (currentOpenSwipeable.current !== null && currentOpenSwipeable.current !== budget.id) {
              swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
            }
            currentOpenSwipeable.current = budget.id;
          }}
        >
          {content}
        </Swipeable>
      );
    }

    return <View key={budget.id}>{content}</View>;
  };

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {budgets && budgets.length > 0 ? (
          budgets.map((budget) => renderBudgetCard(budget))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No budgets set</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Tap + Add to create a budget</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddBudget')}
        activeOpacity={0.8}
        accessibilityLabel="Add new budget"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={48} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Budget?</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Are you sure you want to delete the budget for {budgetToDelete?.category?.name}? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setIsDeleteModalOpen(false);
                  setBudgetToDelete(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  budgetContent: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webActionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  webActionButton: {
    padding: 6,
    borderRadius: 6,
  },
  viewTransactionsButton: {
    padding: 6,
    borderRadius: 6,
  },
  budgetActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
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
    marginTop: 4,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
