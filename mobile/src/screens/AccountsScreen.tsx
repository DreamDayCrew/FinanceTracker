import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatCurrency, COLORS } from '../lib/utils';
import { RootStackParamList } from '../../App';
import { FABButton } from '../components/FABButton';
import type { Account } from '../lib/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const handleDelete = (account: Account) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate(account.id)
        },
      ]
    );
  };

  const bankAccounts = accounts?.filter(a => a.type === 'bank') || [];
  const creditCards = accounts?.filter(a => a.type === 'credit_card') || [];

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Accounts</Text>
          {bankAccounts.length > 0 ? (
            bankAccounts.map((account) => (
              <TouchableOpacity 
                key={account.id} 
                style={styles.accountCard}
                onLongPress={() => handleDelete(account)}
              >
                <View style={styles.accountIcon}>
                  <Ionicons name="business-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  {account.accountNumber && (
                    <Text style={styles.accountNumber}>****{account.accountNumber}</Text>
                  )}
                </View>
                <Text style={styles.accountBalance}>{formatCurrency(account.balance)}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No bank accounts</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Cards</Text>
          {creditCards.length > 0 ? (
            creditCards.map((account) => {
              const used = parseFloat(account.creditLimit || '0') - parseFloat(account.balance);
              const usedPercent = account.creditLimit 
                ? (used / parseFloat(account.creditLimit)) * 100 
                : 0;
              
              return (
                <TouchableOpacity 
                  key={account.id} 
                  style={styles.accountCard}
                  onLongPress={() => handleDelete(account)}
                >
                  <View style={[styles.accountIcon, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="card-outline" size={24} color={COLORS.danger} />
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    {account.accountNumber && (
                      <Text style={styles.accountNumber}>****{account.accountNumber}</Text>
                    )}
                    <View style={styles.creditInfo}>
                      <Text style={styles.creditText}>
                        {formatCurrency(account.balance)} available of {formatCurrency(account.creditLimit || 0)}
                      </Text>
                      <View style={styles.creditBar}>
                        <View 
                          style={[
                            styles.creditFill, 
                            { 
                              width: `${Math.min(usedPercent, 100)}%`,
                              backgroundColor: usedPercent > 80 ? COLORS.danger : COLORS.warning
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="card-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No credit cards</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FABButton onPress={() => navigation.navigate('AddAccount')} icon="add" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
    marginBottom: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdf4',
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
    color: COLORS.text,
  },
  accountNumber: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  creditInfo: {
    marginTop: 8,
  },
  creditText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  creditBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  creditFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 8,
  },
});
