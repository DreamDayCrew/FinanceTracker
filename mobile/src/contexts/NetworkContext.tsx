import React, { createContext, useContext, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from './ThemeContext';
import { getThemedColors } from '../lib/utils';

interface NetworkContextType {
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
});

export const useNetwork = () => useContext(NetworkContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const { isConnected } = useNetworkStatus();
  const { resolvedTheme } = useTheme();
  const colors = getThemedColors(resolvedTheme);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {!isConnected && (
        <View style={[styles.banner, { backgroundColor: '#ef4444' }]}>
          <Ionicons name="cloud-offline" size={16} color="#fff" />
          <Text style={styles.bannerText}>No Internet Connection</Text>
        </View>
      )}
      {children}
    </NetworkContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
