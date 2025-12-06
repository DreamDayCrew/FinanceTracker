import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { COLORS } from '../lib/utils';

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: api.getUser,
  });

  const updateUserMutation = useMutation({
    mutationFn: api.updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const setPinMutation = useMutation({
    mutationFn: api.setPin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setShowPinModal(false);
      setPin('');
      Alert.alert('Success', 'PIN has been set');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to set PIN');
    },
  });

  const resetPinMutation = useMutation({
    mutationFn: api.resetPin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      Alert.alert('Success', 'PIN has been removed');
    },
  });

  const handleSetPin = () => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }
    setPinMutation.mutate(pin);
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove PIN protection?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => resetPinMutation.mutate() },
      ]
    );
  };

  const toggleDarkMode = () => {
    const newTheme = user?.theme === 'dark' ? 'light' : 'dark';
    updateUserMutation.mutate({ theme: newTheme });
  };

  const toggleBiometric = () => {
    updateUserMutation.mutate({ biometricEnabled: !user?.biometricEnabled });
  };

  const hasPin = !!user?.pinHash;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon-outline" size={22} color={COLORS.text} />
            <View>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingSubtitle}>Switch between light and dark theme</Text>
            </View>
          </View>
          <Switch
            value={user?.theme === 'dark'}
            onValueChange={toggleDarkMode}
            trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
            thumbColor={user?.theme === 'dark' ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="key-outline" size={22} color={COLORS.text} />
            <View>
              <Text style={styles.settingTitle}>PIN Lock</Text>
              <Text style={styles.settingSubtitle}>Protect app with 4-digit PIN</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={hasPin ? handleRemovePin : () => setShowPinModal(true)}
          >
            <Text style={styles.actionButtonText}>
              {hasPin ? 'Remove' : 'Set PIN'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="finger-print-outline" size={22} color={COLORS.text} />
            <View>
              <Text style={styles.settingTitle}>Biometric Login</Text>
              <Text style={styles.settingSubtitle}>Use fingerprint to unlock</Text>
            </View>
          </View>
          <Switch
            value={user?.biometricEnabled || false}
            onValueChange={toggleBiometric}
            trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
            thumbColor={user?.biometricEnabled ? COLORS.primary : COLORS.textMuted}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Data</Text>
      <View style={styles.section}>
        <TouchableOpacity style={styles.settingRowButton}>
          <View style={styles.settingInfo}>
            <Ionicons name="download-outline" size={22} color={COLORS.text} />
            <View>
              <Text style={styles.settingTitle}>Export Data</Text>
              <Text style={styles.settingSubtitle}>Download your transactions</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPinModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set PIN</Text>
            <Text style={styles.modalSubtitle}>Enter a 4-digit PIN</Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={pin}
              onChangeText={setPin}
              placeholder="****"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => { setShowPinModal(false); setPin(''); }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonConfirm}
                onPress={handleSetPin}
              >
                <Text style={styles.modalButtonConfirmText}>Set PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  pinInput: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 16,
    width: '100%',
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    color: COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  modalButtonConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});
