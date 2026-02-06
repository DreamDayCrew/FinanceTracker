import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../lib/api';
import { getThemedColors } from '../lib/utils';
import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { MoreStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

const getTypeColor = (type: string) => {
  switch (type) {
    case 'income': return '#22c55e';
    case 'transfer': return '#3b82f6';
    default: return '#ef4444';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'income': return 'Income';
    case 'transfer': return 'Transfer';
    default: return 'Expense';
  }
};

export default function CategoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const queryClient = useQueryClient();

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: api.getCategories,
  });

  const { data: categoryUsage } = useQuery({
    queryKey: ['/api/categories/usage'],
    queryFn: api.getCategoryUsage,
  });

  const deleteCategory = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/usage'] });
    },
  });

  const handleDelete = (categoryId: number, categoryName: string) => {
    const usage = categoryUsage?.find(u => u.categoryId === categoryId);
    const hasUsage = usage && (
      usage.transactionCount > 0 || 
      usage.scheduledPaymentCount > 0 || 
      usage.budgetCount > 0 ||
      usage.insuranceCount > 0 ||
      usage.loanCount > 0
    );

    if (hasUsage) {
      const usageMessages = [];
      if (usage.transactionCount > 0) usageMessages.push(`${usage.transactionCount} transaction(s)`);
      if (usage.scheduledPaymentCount > 0) usageMessages.push(`${usage.scheduledPaymentCount} scheduled payment(s)`);
      if (usage.budgetCount > 0) usageMessages.push(`${usage.budgetCount} budget(s)`);
      if (usage.insuranceCount > 0) usageMessages.push(`${usage.insuranceCount} insurance(s)`);
      if (usage.loanCount > 0) usageMessages.push(`${usage.loanCount} loan(s)`);

      Alert.alert(
        'Cannot Delete Category',
        `"${categoryName}" is linked to:\n\n${usageMessages.join('\n')}\n\nPlease remove these associations first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${categoryName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory.mutate(categoryId),
        },
      ]
    );
  };

  const handleEdit = (categoryId: number) => {
    navigation.navigate('AddCategory', { categoryId });
  };

  const getCategoryIcon = (categoryName: string): string => {
    const iconMap: { [key: string]: string } = {
      'Groceries': 'cart',
      'Transport': 'car',
      'Dining': 'restaurant',
      'Shopping': 'bag-handle',
      'Entertainment': 'game-controller',
      'Bills': 'receipt',
      'Health': 'medical',
      'Education': 'school',
      'Travel': 'airplane',
      'Salary': 'briefcase',
      'Investment': 'trending-up',
      'Transfer': 'repeat',
      'Other': 'ellipsis-horizontal',
      'Food': 'fast-food',
      'Rent': 'home',
      'Utilities': 'flash',
      'Personal': 'person',
      'Insurance': 'shield-checkmark',
      'EMI': 'card',
    };
    return iconMap[categoryName] || 'pricetag';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading categories...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Failed to load categories</Text>
            </View>
          ) : categories && categories.length > 0 ? (
            categories.map((category) => {
              const usage = categoryUsage?.find(u => u.categoryId === category.id);
              const canDelete = !usage || (
                usage.transactionCount === 0 && 
                usage.scheduledPaymentCount === 0 && 
                usage.budgetCount === 0 &&
                usage.insuranceCount === 0 &&
                usage.loanCount === 0
              );

              return (
                <View 
                  key={category.id} 
                  style={[styles.categoryCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.categoryLeft}>
                    <LinearGradient
                      colors={[(category.color || colors.primary) + 'CC', category.color || colors.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconContainer}
                    >
                      <Ionicons name={getValidIconName(category.icon || getCategoryIcon(category.name)) as any} size={24} color="#fff" />
                    </LinearGradient>
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryNameRow}>
                        <Text style={[styles.categoryName, { color: colors.text }]}>
                          {category.name}
                        </Text>
                        {category.type && (
                          <View style={[
                            styles.typeBadge, 
                            { backgroundColor: getTypeColor(category.type) + '20' }
                          ]}>
                            <Text style={[styles.typeBadgeText, { color: getTypeColor(category.type) }]}>
                              {getTypeLabel(category.type)}
                            </Text>
                          </View>
                        )}
                      </View>
                      {usage && (
                        <Text style={[styles.usageText, { color: colors.textMuted }]}>
                          {usage.transactionCount > 0 && `${usage.transactionCount} txns`}
                          {usage.budgetCount > 0 && ` • ${usage.budgetCount} budgets`}
                          {usage.scheduledPaymentCount > 0 && ` • ${usage.scheduledPaymentCount} payments`}
                          {usage.transactionCount === 0 && usage.budgetCount === 0 && usage.scheduledPaymentCount === 0 && 'Not used yet'}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.border }]}
                      onPress={() => handleEdit(category.id)}
                    >
                      <Ionicons name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton, 
                        { backgroundColor: canDelete ? '#fee2e2' : colors.border }
                      ]}
                      onPress={() => handleDelete(category.id, category.name)}
                      disabled={!canDelete}
                    >
                      <Ionicons 
                        name="trash" 
                        size={18} 
                        color={canDelete ? '#ef4444' : colors.textMuted} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No categories yet
              </Text>
              <TouchableOpacity
                style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AddCategory', undefined)}
              >
                <Text style={styles.addFirstButtonText}>Add Your First Category</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddCategory', undefined)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  addFirstButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  usageText: {
    fontSize: 12,
    opacity: 0.7,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
