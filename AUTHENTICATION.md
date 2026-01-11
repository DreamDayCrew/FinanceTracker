# Authentication System

## Overview

The Finance Tracker app includes a comprehensive authentication system with:
- **Email OTP Verification** - Login via one-time password sent to email
- **JWT Token Authentication** - Secure API access with JSON Web Tokens
- **PIN Lock** - 4-digit PIN for quick app access
- **Biometric Authentication** - Fingerprint/Face ID support (coming soon)
- **Multi-User Data Isolation** - Each user's data is completely isolated

## User Flow

### First-Time Login
1. User opens app → **Login Screen**
2. Enter email and username → Request OTP
3. Check email for 6-digit code → **OTP Verification Screen**
4. Enter OTP → Verify
5. New user redirected to → **PIN Setup Screen**
6. Create and confirm 4-digit PIN
7. Access granted to → **Main App**

### Returning User (with PIN)
1. User opens app → **PIN Lock Screen**
2. Enter 4-digit PIN
3. Access granted to → **Main App**

### Returning User (no PIN)
1. User opens app → **Login Screen**
2. Enter email → Request OTP
3. Enter OTP → Verify
4. Access granted to → **Main App** (with option to setup PIN in Settings)

## EmailJS Configuration

### Setup Instructions

1. **Create EmailJS Account**
   - Go to [https://dashboard.emailjs.com/](https://dashboard.emailjs.com/)
   - Sign up for free account

2. **Add Email Service**
   - Navigate to Email Services
   - Click "Add New Service"
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow setup instructions
   - Note down the **Service ID**

3. **Create Email Template**
   - Navigate to Email Templates
   - Click "Create New Template"
   - Use this template:
   
   ```
   Subject: Your Finance Tracker OTP Code
   
   Hello {{to_name}},
   
   Your verification code is: {{otp}}
   
   This code will expire in 5 minutes.
   
   If you didn't request this code, please ignore this email.
   
   Thanks,
   Finance Tracker Team
   ```
   
   - Note down the **Template ID**

4. **Get API Keys**
   - Navigate to Account → General
   - Copy **Public Key**
   - Navigate to Account → API Keys
   - Create new API key and copy **Private Key**

5. **Update .env File**
   
   Add these lines to your `.env` file in the project root:
   
   ```env
   EMAILJS_SERVICE_ID=your_service_id
   EMAILJS_TEMPLATE_ID=your_template_id
   EMAILJS_PUBLIC_KEY=your_public_key
   EMAILJS_PRIVATE_KEY=your_private_key
   ```

### Development Mode

If EmailJS is not configured, the system will:
- Log OTP codes to server console (for testing)
- Still create users and allow OTP verification
- Show warning in server logs: "EmailJS not configured"

## API Endpoints

### POST /api/auth/request-otp
Request an OTP for login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "John Doe"
}
```

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Creates new user if email doesn't exist
- Generates 6-digit OTP (valid for 5 minutes)
- Sends OTP via EmailJS
- Returns success even if email fails (for security)

### POST /api/auth/verify-otp
Verify OTP and login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "John Doe",
    "email": "user@example.com",
    "hasPin": false,
    "biometricEnabled": false
  }
}
```

**Behavior:**
- Generates JWT token valid for 7 days
- Token contains userId and email in payload
- User object includes hasPin and biometricEnabled flags

**Error Responses:**
- Invalid OTP: `{ "error": "Invalid or expired OTP" }`
- No OTP found: `{ "error": "No OTP found for this email" }`

### POST /api/auth/setup-pin
Setup a 4-digit PIN for user.

**Request Body:**
```json
{
  "userId": 1,
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Validates PIN is 4 digits
- Hashes PIN with bcrypt (10 rounds)
- Updates user's pinHash in database

### POST /api/auth/verify-pin
Verify user's PIN for unlock.

**Request Body:**
```json
{
  "userId": 1,
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "John Doe",
    "email": "user@example.com"
  }
}
```

**Behavior:**
- Generates new JWT token on successful PIN verification
- Token should be stored and used for subsequent API calls

### JWT Token Authentication

All protected API endpoints require JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Protected Endpoints:**
- `/api/dashboard` - User's dashboard stats
- `/api/accounts/*` - All account operations
- `/api/transactions/*` - All transaction operations
- `/api/budgets/*` - All budget operations
- `/api/scheduled-payments/*` - All scheduled payment operations
- `/api/savings-goals/*` - All savings goal operations
- `/api/salary-*` - All salary profile operations
- `/api/loans/*` - All loan operations
- `/api/insurance/*` - All insurance operations
- `/api/user` - User profile operations

**Error Responses:**
- No token: `401 Unauthorized { "error": "Access token required" }`
- Invalid token: `403 Forbidden { "error": "Invalid or expired token" }`

### POST /api/auth/toggle-biometric
Enable/disable biometric authentication.

**Request Body:**
```json
{
  "userId": 1,
  "enabled": true
}
```

**Response:**
```json
{
  "success": true
}
```

## Database Schema Updates

### users Table
New columns added:
```sql
email VARCHAR(255) UNIQUE  -- User's email for OTP delivery
pinHash TEXT               -- Bcrypt hash of 4-digit PIN
biometricEnabled BOOLEAN   -- Flag for biometric auth preference
```

### Data Isolation
All user data tables include `userId` foreign key:
- `accounts` - User's bank accounts, credit cards, etc.
- `transactions` - User's financial transactions
- `budgets` - User's budget allocations
- `scheduled_payments` - User's recurring payments
- `savings_goals` - User's savings goals
- `salary_profiles` - User's salary information
- `loans` - User's loan details
- `insurances` - User's insurance policies

**Important**: All API endpoints filter data by the authenticated user's ID from the JWT token, ensuring complete data isolation between users.

## Mobile App Components

### Screens

**LoginScreen.tsx**
- Email and username input
- OTP request button
- Validates email format
- Navigates to OTP verification

**OTPVerificationScreen.tsx**
- 6-digit OTP input
- Auto-focus and paste support
- Resend OTP functionality
- Timer countdown (optional enhancement)
- Navigates to PIN setup or main app

**PinSetupScreen.tsx**
- 4-digit PIN input
- PIN confirmation step
- Skip option for later setup
- Secure text entry

**PinLockScreen.tsx** (existing)
- Unlocks app with PIN
- Biometric option (when implemented)

### Context Updates

**AuthContext.tsx**
- `isAuthenticated` - User has valid session
- `user` - Current user object with hasPin/biometricEnabled
- `login(user)` - Save user to AsyncStorage and update state
- `logout()` - Clear user from AsyncStorage
- `verifyPin(pin)` - Check PIN and unlock app

### API Client

**api.ts**
New methods:
- `requestOTP(email, username)` - Request OTP
- `verifyOTP(email, otp)` - Verify OTP and get user
- `setupPin(userId, pin)` - Setup new PIN
- `verifyPin(userId, pin)` - Verify existing PIN
- `toggleBiometric(userId, enabled)` - Toggle biometric auth

## Security Features
### JWT Token System
- **7-day expiry** - Long-lived tokens for convenience
- **HS256 algorithm** - HMAC with SHA-256
- **Payload contains** - userId and email only
- **Stored in AsyncStorage** - Persistent across app restarts
- **Sent in Authorization header** - Bearer token format
### OTP System
- **6-digit codes** - Easy to type, hard to guess
- **5-minute expiry** - Reduces attack window
- **In-memory storage** - OTPs not saved to database
- **Rate limiting** - Should be added for production

### PIN Protection
- **Bcrypt hashing** - Industry-standard password hashing
- **10 salt rounds** - Balance security and performance
- **4-digit limit** - Quick entry, reasonable security
- **Secure input** - Hidden characters during entry

### Session Management
- **AsyncStorage** - Persistent login state
- **JWT tokens** - Stateless authentication
- **Token refresh** - Get new token on PIN verification
- **App backgrounding** - Triggers PIN lock
- **Auto-logout** - On token expiry (401/403 responses)

## Data Isolation & Security

### How Data Isolation Works

1. **JWT Token Verification**
   - Every protected API request includes JWT token
   - Middleware verifies token and extracts userId
   - userId is added to request object

2. **Database Filtering**
   - All storage methods accept userId parameter
   - Queries filter results by userId
   - Example: `storage.getAllAccounts(userId)`

3. **Account Creation**
   - New accounts automatically linked to userId
   - userId extracted from JWT token
   - Example: `account.userId = req.user.userId`

4. **Guaranteed Isolation**
   - User A cannot see User B's data
   - User A cannot modify User B's data
   - All CRUD operations scoped to authenticated user

### Testing Data Isolation

To verify data isolation:
1. Create two users with different emails
2. Login as User A, create accounts and transactions
3. Login as User B, create different data
4. Verify User A only sees their own data
5. Verify API calls with User A's token cannot access User B's data

## Future Enhancements

### Biometric Implementation
- React Native LocalAuthentication
- Fallback to PIN if biometric fails
- Hardware-based encryption

### Security Improvements
- Rate limiting on OTP requests
- Account lockout after failed attempts
- JWT tokens for API authentication
- Refresh tokens for long sessions
- 2FA options (SMS, authenticator apps)

### User Experience
- OTP auto-fill from SMS
- Password recovery flow
- Multi-device support
- Remember device option

## Testing

### Manual Testing Checklist

**Login Flow:**
- [ ] Enter valid email and username
- [ ] Receive OTP via email
- [ ] Enter correct OTP → Success
- [ ] Enter wrong OTP → Error message
- [ ] Request new OTP → Old OTP invalidated

**PIN Setup:**
- [ ] Enter 4-digit PIN
- [ ] Confirm PIN with matching code → Success
- [ ] Confirm PIN with different code → Error
- [ ] Skip PIN setup → Access app without PIN
- [ ] Set PIN later from Settings

**PIN Lock:**
- [ ] Close app with PIN set → Lock screen appears
- [ ] Enter correct PIN → Unlock
- [ ] Enter wrong PIN → Error message
- [ ] Background app → Lock screen on return

**Biometric Toggle:**
- [ ] Enable biometric in Settings → Success
- [ ] Disable biometric → Success
- [ ] Setting persists across app restarts

### Development Testing

Without EmailJS configured:
1. Check server console for OTP codes
2. Use logged OTP for verification
3. All flows should work except email delivery

## Troubleshooting

### OTP Not Received
- Check EmailJS dashboard for errors
- Verify email service is active
- Check spam folder
- Review server logs for OTP code
- Verify .env variables are set

### PIN Lock Not Working
- Check AsyncStorage is installed
- Verify user has PIN set (check database)
- Check AuthContext is properly initialized
- Review app state change listeners

### Biometric Toggle Fails
- Verify API endpoint is accessible
- Check user ID is valid
- Review network connectivity
- Check database update permissions

## Production Checklist

Before deploying to production:

**Security:**
- [ ] Add rate limiting (express-rate-limit)
- [ ] Implement account lockout
- [ ] Add JWT authentication
- [ ] Enable HTTPS only
- [ ] Add request signing
- [ ] Implement CSRF protection

**Monitoring:**
- [ ] Add logging (Winston)
- [ ] Track failed login attempts
- [ ] Monitor OTP send failures
- [ ] Alert on suspicious activity

**User Experience:**
- [ ] Add loading states
- [ ] Implement offline support
- [ ] Add password recovery
- [ ] Email verification for new accounts
- [ ] Terms of service acceptance

**Performance:**
- [ ] Cache user sessions
- [ ] Optimize database queries
- [ ] Add CDN for static assets
- [ ] Implement request queuing

## Support

For issues or questions:
1. Check server logs for error details
2. Verify EmailJS configuration
3. Test with development OTP logging
4. Review database schema updates
5. Check mobile app connectivity
