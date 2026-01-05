import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Switch, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { api } from '../lib/api';
import type { SavingsGoal, Category } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { MoreStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

const GOAL_ICONS = ['flag', 'airplane', 'home', 'school', 'wallet', 'car', 'heart', 'trophy'];
const GOAL_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#F44336', '#FFC107'];

export default function SavingsGoalsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  const [activeTab, setActiveTab] = useState<'progress' | 'manage'>('progress');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isContributionsModalOpen, setIsContributionsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [newGoal, setNewGoal] = useState({ 
    name: '', 
    targetAmount: '', 
    icon: 'flag', 
    color: '#4CAF50' 
  });
  const [contributionAmount, setContributionAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [contributionDate, setContributionDate] = useState(new Date());
  const [showContributionDatePicker, setShowContributionDatePicker] = useState(false);

  const { data: goals, isLoading, refetch: refetchGoals } = useQuery<SavingsGoal[]>({
    queryKey: ['savings-goals'],
    queryFn: api.getSavingsGoals,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: api.getAccounts,
  });

  const { data: contributions = [], refetch: refetchContributions } = useQuery({
    queryKey: ['contributions', selectedGoal?.id],
    queryFn: () => selectedGoal ? api.getContributions(selectedGoal.id) : Promise.resolve([]),
    enabled: !!selectedGoal && isContributionsModalOpen,
  });

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchGoals();
    }, [refetchGoals])
  );

  const createGoalMutation = useMutation({
    mutationFn: (data: { name: string; targetAmount: string; icon: string; color: string }) =>
      api.createSavingsGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsAddModalOpen(false);
      setNewGoal({ name: '', targetAmount: '', icon: 'flag', color: '#4CAF50' });
      Toast.show({
        type: 'success',
        text1: 'Goal Created',
        text2: 'Your savings goal has been created',
        position: 'bottom',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Creation Failed',
        text2: 'Could not create goal. Please try again.',
        position: 'bottom',
      });
    },
  });

  const addContributionMutation = useMutation({
    mutationFn: ({ goalId, amount, accountId, contributedAt }: { goalId: number; amount: string; accountId?: number; contributedAt?: string }) =>
      api.addContribution(goalId, { amount, accountId, contributedAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsContributeModalOpen(false);
      setContributionAmount('');
      setSelectedAccountId(null);
      setSelectedGoal(null);
      setContributionDate(new Date());
      Toast.show({
        type: 'success',
        text1: 'Contribution Added',
        text2: 'Your contribution has been recorded',
        position: 'bottom',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Contribution Failed',
        text2: 'Could not add contribution. Please try again.',
        position: 'bottom',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'completed' | 'paused' }) =>
      api.updateSavingsGoal(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      Toast.show({
        type: 'success',
        text1: 'Goal Updated',
        text2: 'Savings goal status has been updated',
        position: 'bottom',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.deleteSavingsGoal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchGoals();
      Toast.show({
        type: 'success',
        text1: 'Goal Deleted',
        text2: 'Savings goal has been removed',
        position: 'bottom',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Could not delete goal. Please try again.',
        position: 'bottom',
      });
    },
  });

  const deleteContributionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.deleteContribution(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['contributions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetchGoals();
      refetchContributions();
      Toast.show({
        type: 'success',
        text1: 'Contribution Deleted',
        text2: 'Contribution has been removed',
        position: 'bottom',
      });
    },
    onError: (error) => {
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Could not delete contribution. Please try again.',
        position: 'bottom',
      });
    },
  });

  const handleDelete = (goal: SavingsGoal) => {
    deleteMutation.mutate(goal.id);
  };

  const toggleStatus = (goal: SavingsGoal) => {
    const newStatus = goal.status === 'active' ? 'paused' : 'active';
    updateMutation.mutate({
      id: goal.id,
      status: newStatus,
    });
  };

  const calculateProgress = (current: string, target: string) => {
    const currentNum = parseFloat(current || '0');
    const targetNum = parseFloat(target);
    return Math.min((currentNum / targetNum) * 100, 100);
  };

  const activeGoals = goals?.filter(g => g.status === 'active') || [];
  const completedGoals = goals?.filter(g => g.status === 'completed') || [];
  const pausedGoals = goals?.filter(g => g.status === 'paused') || [];
  
  const totalTarget = activeGoals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + parseFloat(g.currentAmount || '0'), 0);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Savings Goals</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {activeGoals.length} active goals
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setIsAddModalOpen(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'progress' ? colors.primary : colors.textMuted }]}>
            Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'manage' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('manage')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'manage' ? colors.primary : colors.textMuted }]}>
            All Goals
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'progress' ? (
          <View style={styles.tabContent}>
            {/* Total Card */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Saved</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalSaved)}</Text>
              <Text style={[styles.totalSubtitle]}>of {formatCurrency(totalTarget)} target</Text>
              <View style={styles.totalProgressBar}>
                <View 
                  style={[
                    styles.totalProgressFill, 
                    { width: `${totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0}%` }
                  ]} 
                />
              </View>
            </View>

            {/* Active Goals */}
            {activeGoals.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No active savings goals</Text>
                <TouchableOpacity
                  style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
                  onPress={() => setIsAddModalOpen(true)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addFirstButtonText}>Add Your First Goal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              activeGoals.map((goal) => {
                const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
                const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount || '0');
                const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
                const isOverdue = targetDate && targetDate < new Date() && goal.status !== 'completed';

                return (
                  <View 
                    key={goal.id} 
                    style={[
                      styles.goalCard, 
                      { backgroundColor: colors.card },
                      isOverdue && { borderColor: '#ef4444', borderWidth: 1 }
                    ]}
                  >
                    <View style={styles.goalHeader}>
                      <View style={[styles.goalIcon, { backgroundColor: goal.color || colors.primary }]}>
                        <Ionicons name={(goal.icon as any) || 'flag'} size={24} color="#fff" />
                      </View>
                      <View style={styles.goalInfo}>
                        <View style={styles.goalNameRow}>
                          <Text style={[styles.goalName, { color: colors.text }]}>
                            {goal.name}
                          </Text>
                          {isOverdue && (
                            <View style={styles.overdueBadge}>
                              <Text style={styles.overdueText}>Overdue</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.goalDetails, { color: colors.textMuted }]}>
                          {formatCurrency(parseFloat(goal.currentAmount || '0'))} of {formatCurrency(parseFloat(goal.targetAmount))}
                          {targetDate && ` • Due ${targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </Text>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                            <View 
                              style={[
                                styles.progressBarFill, 
                                { backgroundColor: colors.primary, width: `${progress}%` }
                              ]} 
                            />
                          </View>
                          <Text style={[styles.progressPercent, { color: colors.textMuted }]}>
                            {progress.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.goalActions}>
                      <TouchableOpacity
                        style={[styles.contributeButton, { backgroundColor: `${colors.primary}20` }]}
                        onPress={() => {
                          setSelectedGoal(goal);
                          setIsContributeModalOpen(true);
                        }}
                      >
                        <Text style={[styles.contributeButtonText, { color: colors.primary }]}>
                          Add Money
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.viewButton, { borderColor: colors.border }]}
                        onPress={() => {
                          setSelectedGoal(goal);
                          setIsContributionsModalOpen(true);
                        }}
                      >
                        <Text style={[styles.viewButtonText, { color: colors.text }]}>
                          View Contributions
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed Goals</Text>
                {completedGoals.map((goal) => (
                  <View 
                    key={goal.id} 
                    style={[styles.completedCard, { backgroundColor: colors.card }]}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                    <View style={styles.completedInfo}>
                      <Text style={[styles.completedName, { color: colors.text }]}>
                        {goal.name}
                      </Text>
                      <Text style={[styles.completedAmount, { color: colors.textMuted }]}>
                        {formatCurrency(parseFloat(goal.targetAmount))}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* All Goals */}
            {goals && goals.length > 0 ? (
              goals.map((goal) => {
                const isActive = goal.status === 'active';
                const progress = calculateProgress(goal.currentAmount, goal.targetAmount);

                return (
                  <View
                    key={goal.id} 
                    style={[
                      styles.manageCard,
                      { backgroundColor: colors.card },
                      !isActive && styles.manageCardInactive
                    ]}
                  >
                    <View style={styles.manageHeader}>
                      <View style={[styles.smallIcon, { backgroundColor: goal.color || colors.primary }]}>
                        <Ionicons name={(goal.icon as any) || 'flag'} size={20} color="#fff" />
                      </View>
                      <View style={styles.manageInfo}>
                        <Text style={[styles.manageName, { color: colors.text }, !isActive && { color: colors.textMuted }]}>
                          {goal.name}
                        </Text>
                        <Text style={[styles.manageAmount, { color: colors.textMuted }]}>
                          {formatCurrency(parseFloat(goal.currentAmount || '0'))} / {formatCurrency(parseFloat(goal.targetAmount))}
                        </Text>
                        <View style={[styles.smallProgressBar, { backgroundColor: colors.border }]}>
                          <View 
                            style={[
                              styles.smallProgressFill, 
                              { backgroundColor: colors.primary, width: `${progress}%` }
                            ]} 
                          />
                        </View>
                      </View>
                      <View style={styles.manageActions}>
                        <View style={styles.statusBadge}>
                          <Text style={[styles.statusText, { color: colors.textMuted }]}>
                            {goal.status}
                          </Text>
                        </View>
                        <View style={styles.actionButtons}>
                          <Switch
                            value={isActive}
                            onValueChange={() => toggleStatus(goal)}
                            trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                            thumbColor={isActive ? colors.primary : colors.textMuted}
                          />
                          <TouchableOpacity 
                            onPress={() => handleDelete(goal)}
                            style={[styles.deleteButton, { backgroundColor: '#fee2e2' }]}
                          >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Ionicons name="flag-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No savings goals yet</Text>
                <TouchableOpacity
                  style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
                  onPress={() => setIsAddModalOpen(true)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addFirstButtonText}>Create Your First Goal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Savings Goal</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: colors.text }]}>Goal Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Vacation Fund"
                placeholderTextColor={colors.textMuted}
                value={newGoal.name}
                onChangeText={(text) => setNewGoal({ ...newGoal, name: text })}
              />

              <Text style={[styles.label, { color: colors.text }]}>Target Amount (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="50000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newGoal.targetAmount}
                onChangeText={(text) => setNewGoal({ ...newGoal, targetAmount: text })}
              />

              <Text style={[styles.label, { color: colors.text }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {GOAL_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconButton,
                      { borderColor: colors.border },
                      newGoal.icon === icon && { borderColor: colors.primary, backgroundColor: `${colors.primary}20` }
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, icon })}
                  >
                    <Ionicons name={icon as any} size={24} color={newGoal.icon === icon ? colors.primary : colors.text} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Color</Text>
              <View style={styles.colorGrid}>
                {GOAL_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      newGoal.color === color && styles.colorButtonSelected
                    ]}
                    onPress={() => setNewGoal({ ...newGoal, color })}
                  >
                    {newGoal.color === color && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { backgroundColor: colors.primary },
                  (!newGoal.name || !newGoal.targetAmount || createGoalMutation.isPending) && styles.submitButtonDisabled
                ]}
                onPress={() => {
                  if (newGoal.name && newGoal.targetAmount && !createGoalMutation.isPending) {
                    createGoalMutation.mutate(newGoal);
                  }
                }}
                disabled={!newGoal.name || !newGoal.targetAmount || createGoalMutation.isPending}
              >
                {createGoalMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Goal</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contribute Modal */}
      <Modal
        visible={isContributeModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsContributeModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add to {selectedGoal?.name}
              </Text>
              <TouchableOpacity onPress={() => setIsContributeModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: colors.text }]}>Amount (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="1000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={contributionAmount}
                onChangeText={setContributionAmount}
              />

              <Text style={[styles.label, { color: colors.text }]}>Contribution Date</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowContributionDatePicker(true)}
              >
                <Text style={[styles.dateButtonText, { color: colors.text }]}>
                  {contributionDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.text} />
              </TouchableOpacity>

              {showContributionDatePicker && (
                <DateTimePicker
                  value={contributionDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowContributionDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setContributionDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              <Text style={[styles.label, { color: colors.text }]}>From Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
                {accounts.map((account: any) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountChip,
                      { borderColor: colors.border, backgroundColor: colors.card },
                      selectedAccountId === account.id && { 
                        borderColor: colors.primary, 
                        backgroundColor: `${colors.primary}20` 
                      }
                    ]}
                    onPress={() => setSelectedAccountId(account.id)}
                  >
                    <Text style={[
                      styles.accountChipText, 
                      { color: colors.text },
                      selectedAccountId === account.id && { color: colors.primary, fontWeight: '600' }
                    ]}>
                      {account.name}
                    </Text>
                    {account.balance && (
                      <Text style={[styles.accountBalance, { color: colors.textMuted }]}>
                        {formatCurrency(parseFloat(account.balance))}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  { backgroundColor: colors.primary },
                  (!contributionAmount || !selectedAccountId || addContributionMutation.isPending) && styles.submitButtonDisabled
                ]}
                onPress={() => {
                  if (selectedGoal && contributionAmount && selectedAccountId && !addContributionMutation.isPending) {
                    addContributionMutation.mutate({ 
                      goalId: selectedGoal.id, 
                      amount: contributionAmount,
                      accountId: selectedAccountId,
                      contributedAt: contributionDate.toISOString()
                    });
                  }
                }}
                disabled={!contributionAmount || !selectedAccountId || addContributionMutation.isPending}
              >
                {addContributionMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Contribution</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contributions List Modal */}
      <Modal
        visible={isContributionsModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsContributionsModalOpen(false);
          setSelectedGoal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Contributions for {selectedGoal?.name}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsContributionsModalOpen(false);
                setSelectedGoal(null);
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {contributions && contributions.length > 0 ? (
                contributions.map((contribution: any) => (
                  <View 
                    key={contribution.id} 
                    style={[styles.contributionItem, { backgroundColor: colors.card }]}
                  >
                    <View style={styles.contributionInfo}>
                      <Text style={[styles.contributionAmount, { color: colors.primary }]}>
                        {formatCurrency(parseFloat(contribution.amount))}
                      </Text>
                      <Text style={[styles.contributionDate, { color: colors.textMuted }]}>
                        {new Date(contribution.contributedAt).toLocaleDateString('en-US', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                        {contribution.account && ` • ${contribution.account.name}`}
                      </Text>
                      {contribution.notes && (
                        <Text style={[styles.contributionNotes, { color: colors.textMuted }]}>
                          {contribution.notes}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      onPress={() => deleteContributionMutation.mutate(contribution.id)}
                      style={[styles.deleteContributionButton, { backgroundColor: '#fee2e2' }]}
                      disabled={deleteContributionMutation.isPending}
                    >
                      {deleteContributionMutation.isPending ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContributions}>
                  <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.text }]}>
                    No contributions yet
                  </Text>
                  <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                    Add your first contribution to this goal
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  totalCard: {
    backgroundColor: '#10b981',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  totalSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  totalProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  totalProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  goalCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
  },
  overdueBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overdueText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  goalDetails: {
    fontSize: 12,
    marginTop: 4,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  goalActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  contributeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contributeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  completedInfo: {
    flex: 1,
  },
  completedName: {
    fontSize: 15,
    fontWeight: '500',
  },
  completedAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  manageCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  manageCardInactive: {
    opacity: 0.6,
  },
  manageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageInfo: {
    flex: 1,
  },
  manageName: {
    fontSize: 15,
    fontWeight: '500',
  },
  manageAmount: {
    fontSize: 12,
    marginTop: 2,
  },
  smallProgressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  smallProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  manageActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  addFirstButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#fff',
  },
  submitButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  accountScroll: {
    marginBottom: 16,
  },
  accountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 8,
    minWidth: 120,
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountBalance: {
    fontSize: 11,
    marginTop: 2,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
  },
  contributionItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  contributionInfo: {
    flex: 1,
  },
  contributionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  contributionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  contributionNotes: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteContributionButton: {
    padding: 8,
    borderRadius: 8,
  },
  emptyContributions: {
    alignItems: 'center',
    padding: 40,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
