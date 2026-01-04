import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, formatCurrency } from '../lib/utils';
import { api } from '../lib/api';
import type { Loan } from '../lib/types';

export default function LoansScreen() {
  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: () => api.getLoans(),
  });

  const getLoanTypeLabel = (type: string) => {
    switch (type) {
      case 'home_loan': return 'Home Loan';
      case 'personal_loan': return 'Personal Loan';
      case 'credit_card_loan': return 'Credit Card';
      case 'item_emi': return 'Item EMI';
      default: return type;
    }
  };

  const getLoanIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'home_loan': return 'home';
      case 'personal_loan': return 'cash';
      case 'credit_card_loan': return 'card';
      case 'item_emi': return 'cart';
      default: return 'document';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.primary;
      case 'closed': return '#6b7280';
      case 'defaulted': return '#ef4444';
      default: return COLORS.textMuted;
    }
  };

  const renderLoan = ({ item }: { item: Loan }) => (
    <View style={styles.loanCard}>
      <View style={styles.loanHeader}>
        <View style={[styles.loanIcon, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons name={getLoanIcon(item.loanType)} size={24} color={getStatusColor(item.status)} />
        </View>
        <View style={styles.loanInfo}>
          <Text style={styles.loanName}>{item.name}</Text>
          <Text style={styles.loanType}>{getLoanTypeLabel(item.loanType)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.loanDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Principal</Text>
          <Text style={styles.detailValue}>{formatCurrency(parseFloat(item.principalAmount))}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>EMI</Text>
          <Text style={styles.emiValue}>{formatCurrency(parseFloat(item.emiAmount))}/month</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Interest Rate</Text>
          <Text style={styles.detailValue}>{item.interestRate}%</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tenure</Text>
          <Text style={styles.detailValue}>{item.tenureMonths} months</Text>
        </View>
      </View>

      {item.lenderName && (
        <View style={styles.lenderRow}>
          <Ionicons name="business-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.lenderText}>{item.lenderName}</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(!loans || loans.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Loans</Text>
          <Text style={styles.emptySubtitle}>Add your loans and EMIs in the web app</Text>
        </View>
      ) : (
        <FlatList
          data={loans}
          renderItem={renderLoan}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  loanCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanInfo: {
    flex: 1,
  },
  loanName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  loanType: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loanDetails: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  emiValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  lenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  lenderText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
