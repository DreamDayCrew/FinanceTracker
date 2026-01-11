import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import { api } from '../lib/api';
import { formatCurrency, getThemedColors } from '../lib/utils';
import { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;

export default function ExpenseDetailsScreen() {
  const navigation = useNavigation();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data, isLoading, error } = useQuery({
    queryKey: ['categoryBreakdown', selectedMonth, selectedYear],
    queryFn: () => api.getCategoryBreakdown(selectedMonth, selectedYear),
  });

  const pieChartData = useMemo(() => {
    if (!data?.breakdown || data.breakdown.length === 0) return [];
    
    return data.breakdown
      .filter(item => parseFloat(item.total) > 0) // Filter out zero amounts
      .map((item, index) => ({
        name: item.categoryName.length > 12 ? item.categoryName.substring(0, 12) + '...' : item.categoryName,
        amount: parseFloat(item.total),
        color: item.color || `hsl(${index * 137.5}, 70%, 60%)`,
        legendFontColor: colors.text,
        legendFontSize: 12,
      }));
  }, [data, colors.text]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date();
    const isCurrentMonth = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();
    
    if (isCurrentMonth) {
      return; // Don't allow going to future months
    }
    
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>Failed to load expense details</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Details</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={[styles.monthNavigation, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text }]}>
          {monthNames[selectedMonth]} {selectedYear}
        </Text>
        <TouchableOpacity 
          onPress={handleNextMonth} 
          style={styles.navButton}
          disabled={isCurrentMonth}
        >
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isCurrentMonth ? colors.textMuted : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
        <Ionicons name="wallet-outline" size={32} color={colors.danger} style={{ marginBottom: 8 }} />
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Expenses</Text>
        <Text style={[styles.totalAmount, { color: colors.danger }]}>
          {formatCurrency(data?.totalExpenses || 0)}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Pie Chart Section */}
        {pieChartData.length > 0 && (
          <View style={[styles.chartSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Expense Distribution</Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => colors.text,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
          
          {data?.breakdown && data.breakdown.length > 0 ? (
            data.breakdown.map((item) => {
              const percentage = data.totalExpenses > 0 
                ? Math.round((item.total / data.totalExpenses) * 100)
                : 0;
              
              return (
                <View key={item.categoryId} style={[styles.categoryItem, { backgroundColor: colors.card }]}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryNameRow}>
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {item.categoryName}
                      </Text>
                    </View>
                    <Text style={[styles.categoryAmount, { color: colors.text }]}>
                      {formatCurrency(item.total)}
                    </Text>
                  </View>
                  <View style={styles.categoryFooter}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${percentage}%`, backgroundColor: item.color }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.percentageText, { color: colors.textMuted }]}>
                      {percentage}%
                    </Text>
                  </View>
                  <Text style={[styles.transactionCount, { color: colors.textMuted }]}>
                    {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="pie-chart-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No expenses this month
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  totalLabel: {
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chartSection: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
  },
  categoryItem: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 38,
    textAlign: 'right',
  },
  transactionCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});
