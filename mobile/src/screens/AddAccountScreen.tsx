import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { getThemedColors } from '../lib/utils';
import { RootStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';

type AddAccountRouteProp = RouteProp<RootStackParamList, 'AddAccount'>;

export default function AddAccountScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddAccountRouteProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const accountId = route.params?.accountId;
  const isEditMode = !!accountId;
  
  const [type, setType] = useState<'bank' | 'credit_card'>('bank');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Fetch account data if editing
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
    enabled: isEditMode,
  });

  useEffect(() => {
    if (isEditMode && accounts) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        setType(account.type as 'bank' | 'credit_card');
        setName(account.name);
        setBalance(account.balance);
        if (account.creditLimit) {
          setCreditLimit(account.creditLimit);
        }
        if (account.accountNumber) {
          setAccountNumber(account.accountNumber);
        }
      }
    }
  }, [isEditMode, accounts, accountId]);

  const createMutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
      Toast.show({
        type: 'success',
        text1: 'Account Created',
        text2: 'Account has been added successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Create Failed',
        text2: 'Could not create account. Please try again.',
        position: 'bottom',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
      Toast.show({
        type: 'success',
        text1: 'Account Updated',
        text2: 'Account has been updated successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not update account. Please try again.',
        position: 'bottom',
      });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter account name',
        position: 'bottom',
      });
      return;
    }
    if (!balance || parseFloat(balance) < 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid balance',
        position: 'bottom',
      });
      return;
    }
    if (type === 'credit_card' && (!creditLimit || parseFloat(creditLimit) <= 0)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter credit limit',
        position: 'bottom',
      });
      return;
    }

    const accountData: any = {
      type,
      name: name.trim(),
      balance,
    };

    if (type === 'credit_card' && creditLimit) {
      accountData.creditLimit = creditLimit;
    }

    if (accountNumber.trim()) {
      accountData.accountNumber = accountNumber.trim();
    }

    if (isEditMode && accountId) {
      updateMutation.mutate({ id: accountId, data: accountData });
    } else {
      createMutation.mutate(accountData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, { backgroundColor: colors.card, borderColor: colors.border }, type === 'bank' && { backgroundColor: colors.primary }]}
          onPress={() => setType('bank')}
        >
          <Ionicons 
            name="business-outline" 
            size={24} 
            color={type === 'bank' ? '#fff' : colors.primary} 
          />
          <Text style={[styles.typeText, { color: colors.text }, type === 'bank' && { color: '#fff' }]}>
            Bank Account
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, { backgroundColor: colors.card, borderColor: colors.border }, type === 'credit_card' && { backgroundColor: colors.primary }]}
          onPress={() => setType('credit_card')}
        >
          <Ionicons 
            name="card-outline" 
            size={24} 
            color={type === 'credit_card' ? '#fff' : colors.primary} 
          />
          <Text style={[styles.typeText, { color: colors.text }, type === 'credit_card' && { color: '#fff' }]}>
            Credit Card
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Account Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={type === 'bank' ? 'e.g., HDFC Savings' : 'e.g., ICICI Credit Card'}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {type === 'bank' ? 'Current Balance' : 'Available Credit'}
        </Text>
        <View style={[styles.amountInputContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
          />
        </View>
      </View>

      {type === 'credit_card' && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Credit Limit</Text>
          <View style={[styles.amountInputContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={creditLimit}
              onChangeText={setCreditLimit}
            />
          </View>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Last 4 Digits (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g., 1234"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={4}
          value={accountNumber}
          onChangeText={setAccountNumber}
        />
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, { backgroundColor: colors.primary }, isPending && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isEditMode ? 'Update Account' : 'Add Account'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  typeButtonActive: {
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#ffffff',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 18,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
