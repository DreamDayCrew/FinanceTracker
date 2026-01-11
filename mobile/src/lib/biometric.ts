import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricInfo {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  isEnrolled: boolean;
}

/**
 * Check if biometric authentication is available on the device
 */
export async function checkBiometricAvailability(): Promise<BiometricInfo> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return { isAvailable: false, biometricType: 'none', isEnrolled: false };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let biometricType: 'fingerprint' | 'facial' | 'iris' | 'none' = 'none';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return {
      isAvailable: true,
      biometricType,
      isEnrolled: enrolled,
    };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return { isAvailable: false, biometricType: 'none', isEnrolled: false };
  }
}

/**
 * Authenticate user using biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to access your account'
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN instead',
      disableDeviceFallback: true, // Don't allow device PIN/pattern as fallback
    });

    if (result.success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.error === 'user_cancel' ? 'Cancelled' : 'Authentication failed' 
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return { success: false, error: 'Authentication error' };
  }
}

/**
 * Get user-friendly biometric name
 */
export function getBiometricName(type: 'fingerprint' | 'facial' | 'iris' | 'none'): string {
  switch (type) {
    case 'fingerprint':
      return 'Fingerprint';
    case 'facial':
      return 'Face ID';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometric';
  }
}
