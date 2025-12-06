import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { COLORS } from '../lib/utils';

export default function AddAccountScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const [type, setType] = useState<'bank_account' | 'credit_card'>('bank_account');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const mutation = useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add account');
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter account name');
      return;
    }
    if (!balance || parseFloat(balance) < 0) {
      Alert.alert('Error', 'Please enter a valid balance');
      return;
    }
    if (type === 'credit_card' && (!creditLimit || parseFloat(creditLimit) <= 0)) {
      Alert.alert('Error', 'Please enter credit limit');
      return;
    }

    mutation.mutate({
      type,
      name: name.trim(),
      balance,
      creditLimit: type === 'credit_card' ? creditLimit : null,
      accountNumber: accountNumber.trim() || null,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, type === 'bank_account' && styles.typeButtonActive]}
          onPress={() => setType('bank_account')}
        >
          <Ionicons 
            name="business-outline" 
            size={24} 
            color={type === 'bank_account' ? '#fff' : COLORS.primary} 
          />
          <Text style={[styles.typeText, type === 'bank_account' && styles.typeTextActive]}>
            Bank Account
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, type === 'credit_card' && styles.typeButtonActive]}
          onPress={() => setType('credit_card')}
        >
          <Ionicons 
            name="card-outline" 
            size={24} 
            color={type === 'credit_card' ? '#fff' : COLORS.primary} 
          />
          <Text style={[styles.typeText, type === 'credit_card' && styles.typeTextActive]}>
            Credit Card
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Account Name</Text>
        <TextInput
          style={styles.input}
          placeholder={type === 'bank_account' ? 'e.g., HDFC Savings' : 'e.g., ICICI Credit Card'}
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          {type === 'bank_account' ? 'Current Balance' : 'Available Credit'}
        </Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
          />
        </View>
      </View>

      {type === 'credit_card' && (
        <View style={styles.field}>
          <Text style={styles.label}>Credit Limit</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={creditLimit}
              onChangeText={setCreditLimit}
            />
          </View>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Last 4 Digits (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 1234"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          maxLength={4}
          value={accountNumber}
          onChangeText={setAccountNumber}
        />
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, mutation.isPending && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Add Account</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.card,
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
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
