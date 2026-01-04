import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import MoreScreen from './src/screens/MoreScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import ScheduledPaymentsScreen from './src/screens/ScheduledPaymentsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddAccountScreen from './src/screens/AddAccountScreen';
import AddBudgetScreen from './src/screens/AddBudgetScreen';
import AddScheduledPaymentScreen from './src/screens/AddScheduledPaymentScreen';
import ScanSMSScreen from './src/screens/ScanSMSScreen';
import SavingsGoalsScreen from './src/screens/SavingsGoalsScreen';
import SalaryScreen from './src/screens/SalaryScreen';
import LoansScreen from './src/screens/LoansScreen';
import PinLockScreen from './src/screens/PinLockScreen';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { getThemedColors, COLORS } from './src/lib/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export type MoreStackParamList = {
  MoreMenu: undefined;
  Budgets: undefined;
  AddBudget: undefined;
  ScheduledPayments: undefined;
  AddScheduledPayment: undefined;
  SavingsGoals: undefined;
  Salary: undefined;
  Loans: undefined;
  Settings: undefined;
  ScanSMS: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  AddTransaction: undefined;
  AddAccount: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Accounts: undefined;
  Transactions: undefined;
  More: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MoreStackNavigator() {
  const { resolvedTheme } = useTheme();
  const colors = getThemedColors(resolvedTheme);
  
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <MoreStack.Screen 
        name="MoreMenu" 
        component={MoreScreen}
        options={{ headerShown: false }}
      />
      <MoreStack.Screen 
        name="Budgets" 
        component={BudgetsScreen}
        options={{ title: 'Plan Budget' }}
      />
      <MoreStack.Screen 
        name="AddBudget" 
        component={AddBudgetScreen}
        options={{ title: 'Add Budget' }}
      />
      <MoreStack.Screen 
        name="ScheduledPayments" 
        component={ScheduledPaymentsScreen}
        options={{ title: 'Scheduled Payments' }}
      />
      <MoreStack.Screen 
        name="AddScheduledPayment" 
        component={AddScheduledPaymentScreen}
        options={{ title: 'Add Payment' }}
      />
      <MoreStack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <MoreStack.Screen 
        name="ScanSMS" 
        component={ScanSMSScreen}
        options={{ title: 'Scan SMS' }}
      />
      <MoreStack.Screen 
        name="SavingsGoals" 
        component={SavingsGoalsScreen}
        options={{ title: 'Savings Goals' }}
      />
      <MoreStack.Screen 
        name="Salary" 
        component={SalaryScreen}
        options={{ title: 'Salary Income' }}
      />
      <MoreStack.Screen 
        name="Loans" 
        component={LoansScreen}
        options={{ title: 'Loans & EMI' }}
      />
    </MoreStack.Navigator>
  );
}

function TabNavigator() {
  const { resolvedTheme } = useTheme();
  const colors = getThemedColors(resolvedTheme);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: keyof TabParamList } }) => ({
        tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'list' : 'list-outline';
          } else {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'My Tracker' }}
      />
      <Tab.Screen 
        name="Accounts" 
        component={AccountsScreen}
        options={{ title: 'Accounts' }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{ title: 'Transactions' }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreStackNavigator}
        options={{ title: 'More', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { resolvedTheme } = useTheme();
  const { isLocked, isLoading } = useAuth();
  const colors = getThemedColors(resolvedTheme);
  
  const navigationTheme = resolvedTheme === 'dark' ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isLocked) {
    return <PinLockScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <RootStack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
        <RootStack.Screen 
          name="AddTransaction" 
          component={AddTransactionScreen}
          options={{ title: 'Add Transaction', presentation: 'modal' }}
        />
        <RootStack.Screen 
          name="AddAccount" 
          component={AddAccountScreen}
          options={{ title: 'Add Account', presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <MainApp />
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
