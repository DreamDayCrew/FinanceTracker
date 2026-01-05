import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { getThemedColors } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { MoreStackParamList } from '../../App';

type AddBudgetRouteProp = RouteProp<MoreStackParamList, 'AddBudget'>;

export default function AddBudgetScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddBudgetRouteProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const budgetId = route.params?.budgetId;
  const isEditMode = !!budgetId;
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: budgets } = useQuery({
    queryKey: ['budgets', month, year],
    queryFn: () => api.getBudgets(month, year),
    enabled: isEditMode,
  });

  const createMutation = useMutation({
    mutationFn: api.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
      Toast.show({
        type: 'success',
        text1: 'Budget Created',
        text2: 'Budget has been added successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Create Budget',
        text2: 'Please try again',
        position: 'bottom',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigation.goBack();
      Toast.show({
        type: 'success',
        text1: 'Budget Updated',
        text2: 'Budget has been updated successfully',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Budget',
        text2: 'Please try again',
        position: 'bottom',
      });
    },
  });

  useEffect(() => {
    if (isEditMode && budgets && budgetId) {
      const budget = budgets.find(b => b.id === budgetId);
      if (budget) {
        setAmount(budget.amount);
        setSelectedCategoryId(budget.categoryId);
      }
    }
  }, [isEditMode, budgets, budgetId]);

  const handleSubmit = () => {
    if (!selectedCategoryId) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select a category',
        position: 'bottom',
      });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter a valid amount',
        position: 'bottom',
      });
      return;
    }

    const budgetData = {
      categoryId: selectedCategoryId,
      amount,
      month,
      year,
    };

    if (isEditMode && budgetId) {
      updateMutation.mutate({ id: budgetId, data: budgetData });
    } else {
      createMutation.mutate(budgetData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Budget Amount</Text>
        <View style={[styles.amountContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>₹</Text>
          <TextInput
            style={[styles.amountInput, { color: colors.text }]}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {expenseCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                { backgroundColor: colors.card },
                selectedCategoryId === category.id && { backgroundColor: colors.primary }
              ]}
              onPress={() => setSelectedCategoryId(category.id)}
            >
              <Text style={[
                styles.categoryName,
                { color: colors.text },
                selectedCategoryId === category.id && { color: '#fff' }
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, { backgroundColor: colors.primary }, isPending && styles.submitButtonDisabled]} 
        onPress={handleSubmit}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{isEditMode ? 'Update Budget' : 'Save Budget'}</Text>
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
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '300',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  categoryCardActive: {
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryNameActive: {
    color: '#ffffff',
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
