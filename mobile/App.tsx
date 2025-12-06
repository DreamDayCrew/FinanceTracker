import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

import { COLORS } from './src/lib/utils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export type RootStackParamList = {
  Main: undefined;
  AddTransaction: undefined;
  AddAccount: undefined;
  Budgets: undefined;
  AddBudget: undefined;
  ScheduledPayments: undefined;
  AddScheduledPayment: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Accounts: undefined;
  Transactions: undefined;
  More: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
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
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.text,
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
        component={MoreScreen}
        options={{ title: 'More' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.background,
              },
              headerTintColor: COLORS.text,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          >
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="AddTransaction" 
              component={AddTransactionScreen}
              options={{ title: 'Add Transaction' }}
            />
            <Stack.Screen 
              name="AddAccount" 
              component={AddAccountScreen}
              options={{ title: 'Add Account' }}
            />
            <Stack.Screen 
              name="Budgets" 
              component={BudgetsScreen}
              options={{ title: 'Plan Budget' }}
            />
            <Stack.Screen 
              name="AddBudget" 
              component={AddBudgetScreen}
              options={{ title: 'Add Budget' }}
            />
            <Stack.Screen 
              name="ScheduledPayments" 
              component={ScheduledPaymentsScreen}
              options={{ title: 'Scheduled Payments' }}
            />
            <Stack.Screen 
              name="AddScheduledPayment" 
              component={AddScheduledPaymentScreen}
              options={{ title: 'Add Payment' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
