import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api, API_BASE_URL } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface SalaryProfile {
  id: number;
  paydayRule: string;
  fixedDay: number | null;
  monthlyAmount: string | null;
  accountId: number | null;
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: string;
}

interface Payday {
  month: number;
  year: number;
  date: string;
}

interface SalaryCycle {
  id: number;
  month: number;
  year: number;
  expectedPayDate: string;
  actualPayDate: string | null;
  expectedAmount: string | null;
  actualAmount: string | null;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SalaryScreen() {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  const queryClient = useQueryClient();

  const [paydayRule, setPaydayRule] = useState('last_working_day');
  const [fixedDay, setFixedDay] = useState('25');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [showSalary, setShowSalary] = useState(false);
  const [editingCycle, setEditingCycle] = useState<SalaryCycle | null>(null);
  const [editActualDate, setEditActualDate] = useState('');
  const [editActualAmount, setEditActualAmount] = useState('');

  const { data: profile, isLoading } = useQuery<SalaryProfile | null>({
    queryKey: ['salary-profile'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/salary-profile`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: nextPaydays = [] } = useQuery<Payday[]>({
    queryKey: ['salary-profile-paydays'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/salary-profile/next-paydays`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/accounts`);
      if (!res.ok) return [];
      const allAccounts = await res.json();
      return allAccounts.filter((acc: Account) => acc.type === 'bank');
    },
  });

  const { data: salaryCycles = [] } = useQuery<SalaryCycle[]>({
    queryKey: ['salary-cycles'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/salary-cycles?limit=3`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const updateCycleMutation = useMutation({
    mutationFn: async ({ id, actualPayDate, actualAmount }: { id: number; actualPayDate: string; actualAmount: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/salary-cycles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualPayDate, actualAmount }),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-cycles'] });
      setEditingCycle(null);
      Toast.show({
        type: 'success',
        text1: 'Updated',
        text2: 'Salary date updated successfully',
        position: 'bottom',
      });
    },
  });

  const handleEditCycle = (cycle: SalaryCycle) => {
    setEditingCycle(cycle);
    setEditActualDate(cycle.actualPayDate || cycle.expectedPayDate);
    setEditActualAmount(cycle.actualAmount || cycle.expectedAmount || '');
  };

  const handleSaveCycle = () => {
    if (editingCycle) {
      updateCycleMutation.mutate({
        id: editingCycle.id,
        actualPayDate: editActualDate,
        actualAmount: editActualAmount,
      });
    }
  };

  useEffect(() => {
    if (profile) {
      setPaydayRule(profile.paydayRule || 'last_working_day');
      setFixedDay(profile.fixedDay?.toString() || '25');
      setMonthlyAmount(profile.monthlyAmount || '');
      setAccountId(profile.accountId || null);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        paydayRule,
        fixedDay: paydayRule === 'fixed_day' ? parseInt(fixedDay) : null,
        weekdayPreference: null,
        monthlyAmount: monthlyAmount || null,
        accountId: accountId || null,
        isActive: true,
      };

      const url = profile 
        ? `${API_BASE_URL}/api/salary-profile/${profile.id}`
        : `${API_BASE_URL}/api/salary-profile`;

      const res = await fetch(url, {
        method: profile ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-profile'] });
      queryClient.invalidateQueries({ queryKey: ['salary-profile-paydays'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({
        type: 'success',
        text1: 'Salary Settings Saved',
        text2: 'Your salary information has been updated',
        position: 'bottom',
      });
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Could not save salary settings',
        position: 'bottom',
      });
    },
  });

  const formatPaydayDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Salary Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <View style={styles.summaryContent}>
          <Ionicons name="wallet" size={40} color="#fff" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Monthly Salary</Text>
            <Text style={styles.summaryAmount}>
              {monthlyAmount ? (showSalary ? formatCurrency(parseFloat(monthlyAmount)) : '₹ *********') : 'Not set'}
            </Text>
          </View>
          {monthlyAmount && (
            <TouchableOpacity
              onPress={() => setShowSalary(!showSalary)}
              style={styles.visibilityButton}
            >
              <Ionicons name={showSalary ? 'eye-off' : 'eye'} size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Payday Settings Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Payday Settings</Text>
        
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Credit Account</Text>
          <View style={[styles.accountSelector, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.accountList}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      accountId === account.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => setAccountId(account.id)}
                  >
                    <Text style={[
                      styles.accountChipText,
                      { color: colors.text },
                      accountId === account.id && { color: colors.primary, fontWeight: '600' }
                    ]}>
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Monthly Amount (₹)</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="50000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={monthlyAmount}
              onChangeText={setMonthlyAmount}
              secureTextEntry={!showSalary}
            />
            {monthlyAmount && (
              <TouchableOpacity
                onPress={() => setShowSalary(!showSalary)}
                style={styles.inputIcon}
              >
                <Ionicons name={showSalary ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textMuted }]}>When do you get paid?</Text>
          <View style={styles.paydayRuleButtons}>
            <TouchableOpacity
              style={[
                styles.paydayRuleButton,
                { backgroundColor: colors.background, borderColor: colors.border },
                paydayRule === 'last_working_day' && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => setPaydayRule('last_working_day')}
            >
              <Text style={[
                styles.paydayRuleText,
                { color: colors.text },
                paydayRule === 'last_working_day' && { color: colors.primary, fontWeight: '600' }
              ]}>
                Last working day of month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paydayRuleButton,
                { backgroundColor: colors.background, borderColor: colors.border },
                paydayRule === 'fixed_day' && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => setPaydayRule('fixed_day')}
            >
              <Text style={[
                styles.paydayRuleText,
                { color: colors.text },
                paydayRule === 'fixed_day' && { color: colors.primary, fontWeight: '600' }
              ]}>
                Fixed day each month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {paydayRule === 'fixed_day' && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Day of Month (1-28)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="25"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={fixedDay}
              onChangeText={setFixedDay}
              maxLength={2}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Past Paydays Card */}
      {salaryCycles.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={20} color={colors.text} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Past Paydays</Text>
          </View>
          
          <View style={styles.paydayList}>
            {salaryCycles.map((cycle) => (
              <View 
                key={cycle.id}
                style={[
                  styles.paydayItem,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }
                ]}
              >
                <View style={styles.paydayContent}>
                  <View style={[styles.monthBadge, { backgroundColor: colors.card }]}>
                    <Text style={[styles.monthText, { color: colors.text }]}>
                      {MONTH_NAMES[cycle.month - 1]}
                    </Text>
                  </View>
                  <View style={styles.paydayInfo}>
                    <Text style={[styles.paydayDate, { color: colors.text }]}>
                      {cycle.actualPayDate ? new Date(cycle.actualPayDate).toLocaleDateString('en-IN') : 'Not paid yet'}
                    </Text>
                    <Text style={[styles.paydayLabel, { color: colors.textMuted }]}>
                      {MONTH_NAMES[cycle.month - 1]} {cycle.year}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleEditCycle(cycle)}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Upcoming Paydays Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar" size={20} color={colors.text} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Upcoming Paydays</Text>
        </View>
        
        {nextPaydays.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Configure your settings to see payday predictions
          </Text>
        ) : (
          <View style={styles.paydayList}>
            {nextPaydays.map((payday, index) => {
              const isThisMonth = index === 0;
              return (
                <View 
                  key={`${payday.month}-${payday.year}`}
                  style={[
                    styles.paydayItem,
                    { 
                      backgroundColor: isThisMonth ? colors.primary + '20' : colors.background,
                      borderColor: isThisMonth ? colors.primary + '40' : colors.border,
                    }
                  ]}
                >
                  <View style={styles.paydayContent}>
                    <View style={[styles.monthBadge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.monthText, { color: colors.text }]}>
                        {MONTH_NAMES[payday.month - 1]}
                      </Text>
                    </View>
                    <View style={styles.paydayInfo}>
                      <Text style={[styles.paydayDate, { color: colors.text }]}>
                        {formatPaydayDate(payday.date)}
                      </Text>
                      <Text style={[styles.paydayLabel, { color: colors.textMuted }]}>
                        {isThisMonth ? 'This month' : `${MONTH_NAMES[payday.month - 1]} ${payday.year}`}
                      </Text>
                    </View>
                  </View>
                  {isThisMonth && (
                    <Text style={[styles.nextBadge, { color: colors.primary }]}>Next</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Edit Cycle Modal */}
      {editingCycle && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Salary - {MONTH_NAMES[editingCycle.month - 1]} {editingCycle.year}
              </Text>
              <TouchableOpacity onPress={() => setEditingCycle(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Actual Pay Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={editActualDate ? new Date(editActualDate).toISOString().split('T')[0] : ''}
                  onChangeText={(text) => {
                    const date = new Date(text);
                    if (!isNaN(date.getTime())) {
                      setEditActualDate(date.toISOString());
                    }
                  }}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Actual Amount (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Amount"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={editActualAmount}
                  onChangeText={setEditActualAmount}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setEditingCycle(null)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveCycle}
                  disabled={updateCycleMutation.isPending}
                >
                  {updateCycleMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
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
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryText: {
    flex: 1,
  },
  visibilityButton: {
    padding: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  accountSelector: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  accountList: {
    flexDirection: 'row',
    gap: 8,
  },
  accountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  accountChipText: {
    fontSize: 14,
  },
  paydayRuleButtons: {
    gap: 12,
  },
  paydayRuleButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  paydayRuleText: {
    fontSize: 15,
    textAlign: 'center',
  },
  saveButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    padding: 16,
  },
  paydayList: {
    gap: 8,
  },
  paydayItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paydayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  monthBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
  },
  paydayInfo: {
    flex: 1,
  },
  paydayDate: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  paydayLabel: {
    fontSize: 12,
  },
  nextBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  modalContent: {
    padding: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
