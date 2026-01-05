import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import type { Loan } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

interface LoanSummary {
  totalLoans: number;
  totalOutstanding: number;
  totalEmiThisMonth: number;
  nextEmiDue: { loanName: string; amount: string; dueDate: string } | null;
}

type RootStackParamList = {
  Loans: undefined;
  LoanDetails: { loanId: number };
  AddLoan: undefined;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function LoansScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: () => api.getLoans(),
  });

  const { data: loanSummary } = useQuery<LoanSummary>({
    queryKey: ['loan-summary'],
    queryFn: async () => {
      const res = await fetch(`${api.API_BASE_URL || 'http://localhost:5000'}/api/loan-summary`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  };

  const calculateProgress = (loan: Loan): number => {
    const principal = parseFloat(loan.principalAmount) || 0;
    const outstanding = parseFloat(loan.outstandingAmount) || 0;
    if (principal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((principal - outstanding) / principal) * 100)));
  };

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
    const progress = calculateProgress(item);
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity
        style={[styles.loanCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.loanHeader}>
          <View style={[styles.loanIcon, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={getLoanIcon(item.loanType)} size={24} color={statusColor} />
          </View>
          <View style={styles.loanInfo}>
            <Text style={[styles.loanName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.loanType, { color: colors.textMuted }]}>{getLoanTypeLabel(item.loanType)}</Text>
          </View>
          <View style={styles.loanRight}>
            <Text style={[styles.outstandingAmount, { color: colors.text }]}>
              {formatCurrency(parseFloat(item.outstandingAmount))}
            </Text>
            <Text style={[styles.remainingLabel, { color: colors.textMuted }]}>remaining</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>{progress}% paid</Text>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            EMI: {formatCurrency(parseFloat(item.emiAmount || '0'))}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loanSummary && (
        <View style={[styles.summaryCard, { backgroundColor: colors.danger }]}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconCircle}>
              <Ionicons name="business" size={20} color="#fff" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Total Outstanding</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(loanSummary.totalOutstanding)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Active Loans</Text>
              <Text style={styles.summaryStatValue}>{loanSummary.totalLoans}</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>EMI This Month</Text>
              <Text style={styles.summaryStatValue}>{formatCurrency(loanSummary.totalEmiThisMonth)}</Text>
            </View>
          </View>
          {loanSummary.nextEmiDue && (
            <View style={styles.nextEmiContainer}>
              <Ionicons name="calendar" size={14} color="#fff" />
              <Text style={styles.nextEmiText}>
                Next: {loanSummary.nextEmiDue.loanName} - {formatCurrency(parseFloat(loanSummary.nextEmiDue.amount))} on {formatDate(loanSummary.nextEmiDue.dueDate)}
              </Text>
            </View>
          )}
        </View>
      )}

      {(!loans || loans.length === 0) ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Loans</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Track your home loan, car loan, or EMIs
          </Text>
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

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddLoan')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Loan</Text>
      </TouchableOpacity>

      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 16,
  },
  summaryStat: {
    flex: 1,
  },
  summaryStatLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  summaryStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  nextEmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  nextEmiText: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  loanCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    textTransform: 'capitalize',
  },
  loanRight: {
    alignItems: 'flex-end',
  },
  outstandingAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  remainingLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 10,
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
  addButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
