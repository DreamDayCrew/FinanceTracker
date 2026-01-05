import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SwipeAction = 'edit' | 'delete';

export interface SwipeSettings {
  enabled: boolean;
  leftAction: SwipeAction;
  rightAction: SwipeAction;
}

export const useSwipeSettings = () => {
  const [settings, setSettings] = useState<SwipeSettings>({
    enabled: false,
    leftAction: 'delete',
    rightAction: 'edit',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [enabled, leftAction, rightAction] = await Promise.all([
          AsyncStorage.getItem('swipeEnabled'),
          AsyncStorage.getItem('leftSwipeAction'),
          AsyncStorage.getItem('rightSwipeAction'),
        ]);
        
        setSettings({
          enabled: enabled === 'true',
          leftAction: (leftAction as SwipeAction) || 'delete',
          rightAction: (rightAction as SwipeAction) || 'edit',
        });
      } catch (error) {
        console.error('Error loading swipe settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  return { ...settings, isLoading };
};
