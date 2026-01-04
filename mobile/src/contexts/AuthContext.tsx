import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

interface AuthContextType {
  isLocked: boolean;
  isLoading: boolean;
  hasPin: boolean;
  unlock: () => void;
  checkPinRequired: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STATE_KEY = '@auth_unlocked';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    checkPinRequired();
  }, []);

  const checkPinRequired = async () => {
    try {
      setIsLoading(true);
      const user = await api.getUser();
      const userHasPin = !!user?.pinHash;
      setHasPin(userHasPin);
      
      if (!userHasPin) {
        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Failed to check PIN status:', error);
      setIsLocked(false);
      setHasPin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = () => {
    setIsLocked(false);
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    try {
      const result = await api.verifyPin(pin);
      if (result.valid) {
        unlock();
        return true;
      }
      return false;
    } catch (error) {
      console.error('PIN verification failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ isLocked, isLoading, hasPin, unlock, checkPinRequired, verifyPin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
