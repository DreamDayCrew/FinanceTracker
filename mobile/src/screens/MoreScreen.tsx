import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/utils';
import { MoreStackParamList } from '../../App';

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
    color: COLORS.primary,
  },
  {
    icon: 'calendar-outline',
    title: 'Scheduled Payments',
    subtitle: 'Manage recurring payments',
    route: 'ScheduledPayments',
    color: '#8b5cf6',
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>More</Text>
      
      <View style={styles.menuList}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>My Tracker v1.0.2</Text>
        <Text style={styles.footerSubtext}>Personal Finance Manager</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    marginTop: 50,
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
