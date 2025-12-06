import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { COLORS, formatCurrency } from '../lib/utils';

interface ParsedTransaction {
  type: 'credit' | 'debit';
  amount: number;
  merchant?: string;
  accountNumber?: string;
  balance?: number;
}

export default function ScanSMSScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [smsText, setSmsText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const parseMutation = useMutation({
    mutationFn: api.parseSMS,
    onSuccess: (data) => {
      if (data && data.amount) {
        setParsedData(data);
        if (data.accountNumber && accounts) {
          const matchingAccount = accounts.find(a => 
            a.accountNumber && a.accountNumber === data.accountNumber
          );
          if (matchingAccount) {
            setSelectedAccountId(matchingAccount.id);
          }
        }
      } else {
        Alert.alert('Parse Failed', 'Could not extract transaction details from this SMS. Please try a different message.');
      }
    },
    onError: () => {
      Alert.alert('Error', 'Failed to parse SMS. Please check your connection and try again.');
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('Success', 'Transaction added successfully!', [
        { text: 'Add Another', onPress: resetForm },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save transaction');
    },
  });

  const resetForm = () => {
    setSmsText('');
    setParsedData(null);
    setSelectedAccountId(null);
    setSelectedCategoryId(null);
  };

  const handleParseSMS = () => {
    if (!smsText.trim()) {
      Alert.alert('Error', 'Please paste SMS text first');
      return;
    }
    parseMutation.mutate(smsText);
  };

  const handleSaveTransaction = () => {
    if (!parsedData) {
      Alert.alert('Error', 'Please parse SMS first');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    createMutation.mutate({
      type: parsedData.type,
      amount: parsedData.amount,
      merchant: parsedData.merchant || 'Unknown',
      description: `Parsed from SMS`,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId || undefined,
      transactionDate: new Date().toISOString(),
    });
  };

  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];
  const incomeCategories = categories?.filter(c => c.type === 'income') || [];
  const relevantCategories = parsedData?.type === 'credit' ? incomeCategories : expenseCategories;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Paste your bank SMS here to automatically extract transaction details using AI.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Paste SMS Text</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Paste your bank SMS here...&#10;&#10;Example:&#10;INR 500.00 debited from A/c XX1234 on 06-Dec-24 at AMAZON. Avl Bal: INR 5000.00"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={6}
          value={smsText}
          onChangeText={setSmsText}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.parseButton, parseMutation.isPending && styles.buttonDisabled]}
          onPress={handleParseSMS}
          disabled={parseMutation.isPending}
        >
          {parseMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="scan-outline" size={20} color="#fff" />
              <Text style={styles.parseButtonText}>Parse SMS</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {parsedData && (
        <>
          <View style={styles.parsedCard}>
            <Text style={styles.parsedTitle}>Extracted Details</Text>
            <View style={styles.parsedRow}>
              <Text style={styles.parsedLabel}>Type:</Text>
              <View style={[
                styles.typeBadge,
                { backgroundColor: parsedData.type === 'credit' ? '#dcfce7' : '#fee2e2' }
              ]}>
                <Text style={[
                  styles.typeBadgeText,
                  { color: parsedData.type === 'credit' ? COLORS.primary : COLORS.danger }
                ]}>
                  {parsedData.type === 'credit' ? 'Income' : 'Expense'}
                </Text>
              </View>
            </View>
            <View style={styles.parsedRow}>
              <Text style={styles.parsedLabel}>Amount:</Text>
              <Text style={styles.parsedValue}>{formatCurrency(parsedData.amount)}</Text>
            </View>
            {parsedData.merchant && (
              <View style={styles.parsedRow}>
                <Text style={styles.parsedLabel}>Merchant:</Text>
                <Text style={styles.parsedValue}>{parsedData.merchant}</Text>
              </View>
            )}
            {parsedData.accountNumber && (
              <View style={styles.parsedRow}>
                <Text style={styles.parsedLabel}>Account:</Text>
                <Text style={styles.parsedValue}>****{parsedData.accountNumber}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Select Account *</Text>
            <View style={styles.optionsGrid}>
              {accounts?.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.optionButton,
                    selectedAccountId === account.id && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSelectedAccountId(account.id)}
                >
                  <Ionicons 
                    name={account.type === 'credit_card' ? 'card-outline' : 'wallet-outline'} 
                    size={18} 
                    color={selectedAccountId === account.id ? '#fff' : COLORS.text} 
                  />
                  <Text style={[
                    styles.optionButtonText,
                    selectedAccountId === account.id && styles.optionButtonTextSelected,
                  ]}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Select Category (Optional)</Text>
            <View style={styles.optionsGrid}>
              {relevantCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.optionButton,
                    selectedCategoryId === category.id && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    selectedCategoryId === category.id && styles.optionButtonTextSelected,
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, createMutation.isPending && styles.buttonDisabled]}
            onPress={handleSaveTransaction}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Transaction</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  parseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  parsedCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  parsedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  parsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  parsedLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  parsedValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
