import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import type { Loan } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

export default function LoansScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

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
      case 'active': return colors.primary;
      case 'closed': return colors.textMuted;
      case 'defaulted': return colors.danger;
      default: return colors.textMuted;
    }
  };

  const renderLoan = ({ item }: { item: Loan }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <View style={[styles.loanCard, { backgroundColor: colors.card }]}>
        <View style={styles.loanHeader}>
          <View style={[styles.loanIcon, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={getLoanIcon(item.loanType)} size={24} color={statusColor} />
          </View>
          <View style={styles.loanInfo}>
            <Text style={[styles.loanName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.loanType, { color: colors.textMuted }]}>{getLoanTypeLabel(item.loanType)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={[styles.loanDetails, { backgroundColor: colors.background }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Principal</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(parseFloat(item.principalAmount))}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>EMI</Text>
            <Text style={[styles.emiValue, { color: colors.primary }]}>{formatCurrency(parseFloat(item.emiAmount))}/month</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Interest Rate</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.interestRate}%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Tenure</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{item.tenureMonths} months</Text>
          </View>
        </View>

        {item.lenderName && (
          <View style={styles.lenderRow}>
            <Ionicons name="business-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.lenderText, { color: colors.textMuted }]}>{item.lenderName}</Text>
          </View>
        )}
      </View>
    );
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
      {(!loans || loans.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Loans</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Add your loans and EMIs in the web app</Text>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  loanCard: {
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
  },
  loanType: {
    fontSize: 12,
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
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emiValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  lenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  lenderText: {
    fontSize: 13,
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
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
