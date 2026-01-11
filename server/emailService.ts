import emailjs from '@emailjs/nodejs';

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with 5-minute expiry
export function storeOTP(email: string, otp: string): void {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(email.toLowerCase(), { otp, expiresAt });
  
  // Auto-cleanup after expiry
  setTimeout(() => {
    otpStore.delete(email.toLowerCase());
  }, 5 * 60 * 1000);
}

// Verify OTP
export function verifyOTP(email: string, otp: string): boolean {
  const stored = otpStore.get(email.toLowerCase());
  
  if (!stored) {
    return false;
  }
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  
  if (stored.otp === otp) {
    otpStore.delete(email.toLowerCase());
    return true;
  }
  
  return false;
}

// Send OTP via EmailJS
export async function sendOTP(email: string, username: string, otp: string): Promise<boolean> {
  try {
    // Check if EmailJS credentials are configured
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_TEMPLATE_ID || !process.env.EMAILJS_PUBLIC_KEY || !process.env.EMAILJS_PRIVATE_KEY) {
      console.warn('EmailJS not configured - OTP:', otp, 'for', email);
      return true; // Return true for development without EmailJS
    }

    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        email: email,        // Matches your template's "email" parameter
        to_name: username,   // Matches your template's "to_name" parameter
        otp: otp            // Matches your template's "otp" parameter
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      }
    );
    
    console.log('✅ OTP sent via EmailJS to:', email);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    console.warn('⚠️  EmailJS failed - OTP for development:', otp, 'for', email);
    // Return true for development - allow login even if email fails
    return true;
  }
}
