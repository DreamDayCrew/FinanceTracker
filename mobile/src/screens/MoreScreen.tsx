import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getThemedColors } from '../lib/utils';
import { MoreStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

type NavigationProp = NativeStackNavigationProp<MoreStackParamList>;

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: keyof MoreStackParamList;
  color: string;
}

const menuItems: MenuItem[] = [
  {
    icon: 'scan-outline',
    title: 'Scan SMS',
    subtitle: 'Parse bank SMS to add transaction',
    route: 'ScanSMS',
    color: '#3b82f6',
  },
  {
    icon: 'pie-chart-outline',
    title: 'Plan Budget',
    subtitle: 'Set monthly spending limits',
    route: 'Budgets',
    color: '#16a34a',
  },
  {
    icon: 'calendar-outline',
    title: 'Scheduled Payments',
    subtitle: 'Manage recurring payments',
    route: 'ScheduledPayments',
    color: '#8b5cf6',
  },
  {
    icon: 'flag-outline',
    title: 'Savings Goals',
    subtitle: 'Track your savings targets',
    route: 'SavingsGoals',
    color: '#10b981',
  },
  {
    icon: 'briefcase-outline',
    title: 'Salary Income',
    subtitle: 'Manage salary and paydays',
    route: 'Salary',
    color: '#f59e0b',
  },
  {
    icon: 'document-text-outline',
    title: 'Loans & EMI',
    subtitle: 'Track loans and installments',
    route: 'Loans',
    color: '#ef4444',
  },
  {
    icon: 'settings-outline',
    title: 'Settings',
    subtitle: 'Theme, security, export data',
    route: 'Settings',
    color: '#6b7280',
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>More</Text>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>My Tracker v1.0.5</Text>
          <Text style={[styles.footerSubtext, { color: colors.textMuted }]}>Personal Finance Manager</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
