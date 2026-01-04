import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const appState = useRef(AppState.currentState);
  const hasPinRef = useRef(false);

  useEffect(() => {
    hasPinRef.current = hasPin;
  }, [hasPin]);

  const lockApp = useCallback(() => {
    if (hasPinRef.current) {
      setIsLocked(true);
    }
  }, []);

  useEffect(() => {
    checkPinRequired();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        lockApp();
      }
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, [lockApp]);

  const checkPinRequired = async () => {
    try {
      setIsLoading(true);
      const user = await api.getUser();
      const userHasPin = !!user?.pinHash;
      setHasPin(userHasPin);
      hasPinRef.current = userHasPin;
      
      if (!userHasPin) {
        setIsLocked(false);
      } else {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Failed to check PIN status:', error);
      setIsLocked(false);
      setHasPin(false);
      hasPinRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
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
  }, [unlock]);

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
