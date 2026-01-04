import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getThemedColors, COLORS } from '../lib/utils';

export default function PinLockScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyPin } = useAuth();
  const { resolvedTheme } = useTheme();
  const colors = getThemedColors(resolvedTheme);

  const handleNumberPress = async (num: string) => {
    if (pin.length >= 4) return;
    
    const newPin = pin + num;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      setIsVerifying(true);
      const isValid = await verifyPin(newPin);
      setIsVerifying(false);
      
      if (!isValid) {
        Vibration.vibrate(200);
        setError('Incorrect PIN');
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { 
                backgroundColor: i < pin.length ? colors.primary : 'transparent',
                borderColor: error ? colors.danger : colors.border,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];
    
    return (
      <View style={styles.numberPad}>
        {numbers.map((num, index) => {
          if (num === '') {
            return <View key={index} style={styles.numberButton} />;
          }
          
          if (num === 'delete') {
            return (
              <TouchableOpacity
                key={index}
                style={styles.numberButton}
                onPress={handleDelete}
                disabled={pin.length === 0}
              >
                <Ionicons name="backspace-outline" size={28} color={pin.length === 0 ? colors.textMuted : colors.text} />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={index}
              style={[styles.numberButton, { backgroundColor: colors.card }]}
              onPress={() => handleNumberPress(num)}
              disabled={isVerifying}
            >
              <Text style={[styles.numberText, { color: colors.text }]}>{num}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="lock-closed" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Enter PIN</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Enter your 4-digit PIN to unlock
        </Text>
      </View>

      {isVerifying ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {renderDots()}
          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
        </>
      )}

      {renderNumberPad()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 40,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: -20,
    marginBottom: 20,
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 300,
    alignSelf: 'center',
  },
  numberButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 28,
    fontWeight: '500',
  },
});
