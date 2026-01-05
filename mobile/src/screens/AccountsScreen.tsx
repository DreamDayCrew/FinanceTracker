import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { RootStackParamList } from '../../App';
import { FABButton } from '../components/FABButton';
import type { Account } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
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
    setSelectedAccount(account);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedAccount && !deleteMutation.isPending) {
      deleteMutation.mutate(selectedAccount.id);
    }
  };

  const handleEdit = (account: Account) => {
    navigation.navigate('AddAccount', { accountId: account.id });
  };

  const bankAccounts = accounts?.filter(a => a.type === 'bank') || [];
  const creditCards = accounts?.filter(a => a.type === 'credit_card') || [];

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
            bankAccounts.map((account) => (
              <View key={account.id} style={[styles.accountCard, { backgroundColor: colors.card }]}>
                <View style={[styles.accountIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="business-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
                  {account.accountNumber && (
                    <Text style={[styles.accountNumber, { color: colors.textMuted }]}>****{account.accountNumber}</Text>
                  )}
                  <Text style={[styles.accountBalance, { color: colors.primary }]}>{formatCurrency(account.balance)}</Text>
                </View>
                <View style={styles.accountActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                    onPress={() => handleEdit(account)}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
                    onPress={() => handleDelete(account)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
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
            creditCards.map((account) => {
              const used = parseFloat(account.creditLimit || '0') - parseFloat(account.balance);
              const usedPercent = account.creditLimit 
                ? (used / parseFloat(account.creditLimit)) * 100 
                : 0;
              
              return (
                <View 
                  key={account.id} 
                  style={[styles.accountCard, { backgroundColor: colors.card }]}
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
                        {formatCurrency(account.balance)} available of {formatCurrency(account.creditLimit || 0)}
                      </Text>
                      <View style={[styles.creditBar, { backgroundColor: colors.border }]}>
                        <View 
                          style={[
                            styles.creditFill, 
                            { 
                              width: `${Math.min(usedPercent, 100)}%`,
                              backgroundColor: usedPercent > 80 ? colors.danger : colors.warning
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.accountActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                      onPress={() => handleEdit(account)}
                    >
                      <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
                      onPress={() => handleDelete(account)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
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
                onPress={() => setIsDeleteModalOpen(false)}
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
  accountName: {
    fontSize: 16,
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
