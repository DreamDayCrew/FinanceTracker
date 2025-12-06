import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { formatCurrency, COLORS, getOrdinalSuffix } from '../lib/utils';
import { MoreStackParamList } from '../../App';
import type { ScheduledPayment } from '../lib/types';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

export default function ScheduledPaymentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['scheduled-payments'],
    queryFn: api.getScheduledPayments,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' }) =>
      api.updateScheduledPayment(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteScheduledPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleDelete = (payment: ScheduledPayment) => {
    Alert.alert(
      'Delete Payment',
      `Delete "${payment.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate(payment.id)
        },
      ]
    );
  };

  const toggleStatus = (payment: ScheduledPayment) => {
    updateMutation.mutate({
      id: payment.id,
      status: payment.status === 'active' ? 'inactive' : 'active',
    });
  };

  const totalMonthly = payments
    ?.filter(p => p.status === 'active')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Monthly Total</Text>
          <Text style={styles.headerValue}>{formatCurrency(totalMonthly)}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddScheduledPayment')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {payments && payments.length > 0 ? (
          payments.map((payment) => (
            <TouchableOpacity 
              key={payment.id} 
              style={[styles.paymentCard, payment.status === 'inactive' && styles.paymentCardInactive]}
              onLongPress={() => handleDelete(payment)}
            >
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentName, payment.status === 'inactive' && styles.textInactive]}>
                  {payment.name}
                </Text>
                <Text style={[styles.paymentDue, payment.status === 'inactive' && styles.textInactive]}>
                  Due: {payment.dueDate}{getOrdinalSuffix(payment.dueDate)} of each month
                </Text>
                {payment.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{payment.category.name}</Text>
                  </View>
                )}
              </View>
              <View style={styles.paymentRight}>
                <Text style={[styles.paymentAmount, payment.status === 'inactive' && styles.textInactive]}>
                  {formatCurrency(payment.amount)}
                </Text>
                <Switch
                  value={payment.status === 'active'}
                  onValueChange={() => toggleStatus(payment)}
                  trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                  thumbColor={payment.status === 'active' ? COLORS.primary : COLORS.textMuted}
                />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No scheduled payments</Text>
            <Text style={styles.emptySubtext}>Tap + Add to create one</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  headerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  paymentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentCardInactive: {
    opacity: 0.6,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentDue: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  textInactive: {
    color: COLORS.textMuted,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 17,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
