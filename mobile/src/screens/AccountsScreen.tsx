import { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { RootStackParamList } from '../../App';
import { FABButton } from '../components/FABButton';
import type { Account } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { useSwipeSettings } from '../hooks/useSwipeSettings';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const swipeSettings = useSwipeSettings();
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());
  const currentOpenSwipeable = useRef<number | null>(null);

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

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDeleteModalOpen(false);
      setSelectedAccount(null);
      Toast.show({
        type: 'success',
        text1: 'Account Deleted',
        text2: 'Account has been removed successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      setIsDeleteModalOpen(false);
      setSelectedAccount(null);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Could not delete account. Please try again.',
        position: 'bottom',
      });
    },
  });

  const handleDelete = (account: Account) => {
    console.log('handleDelete called for account:', account.name);
    setSelectedAccount(account);
    setIsDeleteModalOpen(true);
    // Close the swipeable after showing modal
    if (currentOpenSwipeable.current !== null) {
      swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
      currentOpenSwipeable.current = null;
    }
  };

  const confirmDelete = () => {
    if (selectedAccount && !deleteMutation.isPending) {
      deleteMutation.mutate(selectedAccount.id);
    }
  };

  const handleEdit = (account: Account) => {
    console.log('handleEdit called for account:', account.name);
    // Close the swipeable before navigation
    if (currentOpenSwipeable.current !== null) {
      swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
      currentOpenSwipeable.current = null;
    }
    navigation.navigate('AddAccount', { accountId: account.id });
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSelectedAccount(null);
  };

  const bankAccounts = accounts?.filter(a => a.type === 'bank') || [];
  const creditCards = accounts?.filter(a => a.type === 'credit_card') || [];

  console.log('Swipe settings:', swipeSettings);

  const renderRightActions = (account: Account) => {
    const action = swipeSettings.rightAction;
    console.log('renderRightActions - action:', action);
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: action === 'edit' ? colors.primary : '#ef4444' }]}
        onPress={() => {
          console.log('Right swipe action pressed:', action);
          action === 'edit' ? handleEdit(account) : handleDelete(account);
        }}
      >
        <Ionicons name={action === 'edit' ? 'pencil' : 'trash-outline'} size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{action === 'edit' ? 'Edit' : 'Delete'}</Text>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (account: Account) => {
    const action = swipeSettings.leftAction;
    console.log('renderLeftActions - action:', action);
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: action === 'edit' ? colors.primary : '#ef4444' }]}
        onPress={() => {
          console.log('Left swipe action pressed:', action);
          action === 'edit' ? handleEdit(account) : handleDelete(account);
        }}
      >
        <Ionicons name={action === 'edit' ? 'pencil' : 'trash-outline'} size={24} color="#fff" />
        <Text style={styles.swipeActionText}>{action === 'edit' ? 'Edit' : 'Delete'}</Text>
      </TouchableOpacity>
    );
  };

  const renderAccountCard = (account: Account) => {
    const content = (
      <TouchableOpacity 
        style={[styles.accountCard, { backgroundColor: colors.card }]}
        onPress={swipeSettings.enabled ? undefined : () => handleEdit(account)}
        activeOpacity={swipeSettings.enabled ? 1 : 0.7}
        disabled={swipeSettings.enabled}
      >
        <View style={[styles.accountIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="business-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.accountInfo}>
          <View style={styles.accountNameRow}>
            <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
            {account.isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>Default</Text>
              </View>
            )}
          </View>
          {account.accountNumber && (
            <Text style={[styles.accountNumber, { color: colors.textMuted }]}>****{account.accountNumber}</Text>
          )}
          <Text style={[styles.accountBalance, { color: colors.primary }]}>{formatCurrency(account.balance)}</Text>
        </View>
      </TouchableOpacity>
    );

    if (swipeSettings.enabled) {
      return (
        <Swipeable
          key={account.id}
          ref={(ref) => {
            if (ref) {
              swipeableRefs.current.set(account.id, ref);
            } else {
              swipeableRefs.current.delete(account.id);
            }
          }}
          renderRightActions={() => renderRightActions(account)}
          renderLeftActions={() => renderLeftActions(account)}
          onSwipeableOpen={(direction) => {
            // Close previously opened swipeable
            if (currentOpenSwipeable.current !== null && currentOpenSwipeable.current !== account.id) {
              swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
            }
            currentOpenSwipeable.current = account.id;
            
            // Trigger action based on swipe direction
            const action = direction === 'right' ? swipeSettings.rightAction : swipeSettings.leftAction;
            if (action === 'edit') {
              handleEdit(account);
            } else {
              handleDelete(account);
            }
          }}
        >
          {content}
        </Swipeable>
      );
    }

    return <View key={account.id}>{content}</View>;
  };

  const renderCreditCard = (account: Account) => {
    const available = parseFloat(account.balance || '0');
    const limit = parseFloat(account.creditLimit || '0');
    const used = limit - available;
    const usedPercent = limit > 0 ? (used / limit) * 100 : 0;

    // Get spending data from dashboard for this card
    const cardSpending = dashboardData?.creditCardSpending?.find(
      (c: any) => c.accountId === account.id
    );
    
    const monthlyLimit = account.monthlySpendingLimit ? parseFloat(account.monthlySpendingLimit) : null;
    const spent = cardSpending?.spent || 0;
    const spentPercent = monthlyLimit && monthlyLimit > 0 ? (spent / monthlyLimit) * 100 : 0;
    const hasMonthlyLimit = monthlyLimit !== null && monthlyLimit > 0;

    // Color based on monthly spending limit
    let barColor = '#22c55e'; // green default
    if (hasMonthlyLimit) {
      if (spentPercent > 100) {
        barColor = '#ef4444'; // red - over limit
      } else if (spentPercent >= 70) {
        barColor = '#f59e0b'; // orange/yellow - approaching limit
      }
    }

    const content = (
      <TouchableOpacity 
        style={[styles.accountCard, { backgroundColor: colors.card }]}
        onPress={swipeSettings.enabled ? undefined : () => handleEdit(account)}
        activeOpacity={swipeSettings.enabled ? 1 : 0.7}
        disabled={swipeSettings.enabled}
      >
        <View style={[styles.accountIcon, { backgroundColor: colors.danger + '20' }]}>
          <Ionicons name="card-outline" size={24} color={colors.danger} />
        </View>
        <View style={styles.accountInfo}>
          <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
          {account.accountNumber && (
            <Text style={[styles.accountNumber, { color: colors.textMuted }]}>****{account.accountNumber}</Text>
          )}
          <View style={styles.creditInfo}>
            <Text style={[styles.creditText, { color: colors.textMuted }]}>
              {formatCurrency(available)} available of {formatCurrency(limit)}
            </Text>
            <View style={[styles.creditBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.creditFill, 
                  { 
                    width: `${Math.min(usedPercent, 100)}%`,
                    backgroundColor: usedPercent >= 90 ? colors.danger : usedPercent >= 70 ? colors.warning : '#22c55e'
                  }
                ]} 
              />
            </View>
          </View>
          {hasMonthlyLimit && (
            <View style={styles.monthlyLimitInfo}>
              <View style={styles.limitHeader}>
                <Text style={[styles.limitLabel, { color: colors.textMuted }]}>
                  Monthly Spending: <Text style={{ fontWeight: '600', color: spentPercent > 100 ? '#ef4444' : spentPercent >= 70 ? '#f59e0b' : colors.text }}>{formatCurrency(spent)}</Text>
                </Text>
                <Text style={[styles.limitLabel, { color: colors.textMuted }]}>
                  of {formatCurrency(monthlyLimit)}
                </Text>
              </View>
              <View style={styles.spendingBar}>
                <View style={[styles.spendingBarBg, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.spendingBarFill, 
                      { 
                        width: `${Math.min(spentPercent, 100)}%`,
                        backgroundColor: barColor
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.limitPercentage, { color: barColor }]}>
                  {spentPercent.toFixed(0)}%
                </Text>
              </View>
            </View>
          )}
          {!hasMonthlyLimit && (
            <View style={styles.limitInfo}>
              <Text style={[styles.limitLabel, { color: colors.textMuted, fontStyle: 'italic' }]}>
                No monthly limit set
              </Text>
            </View>
          )}
          {account.billingDate && (
            <Text style={[styles.billingDateText, { color: colors.textMuted }]}>
              Billing: {account.billingDate}th of every month
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );

    if (swipeSettings.enabled) {
      return (
        <Swipeable
          key={account.id}
          ref={(ref) => {
            if (ref) {
              swipeableRefs.current.set(account.id, ref);
            } else {
              swipeableRefs.current.delete(account.id);
            }
          }}
          renderRightActions={() => renderRightActions(account)}
          renderLeftActions={() => renderLeftActions(account)}
          onSwipeableOpen={(direction) => {
            // Close previously opened swipeable
            if (currentOpenSwipeable.current !== null && currentOpenSwipeable.current !== account.id) {
              swipeableRefs.current.get(currentOpenSwipeable.current)?.close();
            }
            currentOpenSwipeable.current = account.id;
            
            // Trigger action based on swipe direction
            const action = direction === 'right' ? swipeSettings.rightAction : swipeSettings.leftAction;
            if (action === 'edit') {
              handleEdit(account);
            } else {
              handleDelete(account);
            }
          }}
        >
          {content}
        </Swipeable>
      );
    }

    return <View key={account.id}>{content}</View>;
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Accounts</Text>
          {bankAccounts.length > 0 ? (
            bankAccounts.map((account) => renderAccountCard(account))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="business-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No bank accounts</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Credit Cards</Text>
          {creditCards.length > 0 ? (
            creditCards.map((account) => renderCreditCard(account))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="card-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No credit cards</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FABButton onPress={() => navigation.navigate('AddAccount')} icon="add" />
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDeleteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="trash-outline" size={32} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>
              Are you sure you want to delete "{selectedAccount?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: colors.border }]}
                onPress={handleCancelDelete}
                disabled={deleteMutation.isPending}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Delete</Text>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  accountNumber: {
    fontSize: 13,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: '700',
  },
  creditInfo: {
    marginTop: 8,
  },
  creditText: {
    fontSize: 12,
    marginBottom: 4,
  },
  creditBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  creditFill: {
    height: '100%',
    borderRadius: 2,
  },
  limitInfo: {
    marginTop: 6,
  },
  limitLabel: {
    fontSize: 12,
  },
  monthlyLimitInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  spendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spendingBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  spendingBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  limitPercentage: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  billingDateText: {
    fontSize: 11,
    marginTop: 4,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 8,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
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
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonDelete: {
    backgroundColor: '#ef4444',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
