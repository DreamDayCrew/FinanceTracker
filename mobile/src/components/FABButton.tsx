import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getThemedColors } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

interface FABButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FABButton({ onPress, icon = 'add' }: FABButtonProps) {
  const { resolvedTheme } = useTheme();
  const colors = useMemo(() => getThemedColors(resolvedTheme), [resolvedTheme]);

  return (
    <TouchableOpacity 
      style={[styles.fab, { backgroundColor: colors.primary }]} 
      onPress={onPress} 
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={28} color="#ffffff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
