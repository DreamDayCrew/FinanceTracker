# My Tracker - Mobile App Deployment Guide

This guide covers running the app locally, building an APK for testing, and deploying to Expo/Play Store.

## Prerequisites

1. **Node.js** (v18 or later)
2. **npm** or **yarn**
3. **Expo CLI** - Install globally:
   ```bash
   npm install -g expo-cli eas-cli
   ```
4. **Expo Account** - Create one at [expo.dev](https://expo.dev)

---

## 1. Running Locally

### Step 1: Install Dependencies

```bash
cd mobile
npm install
```

### Step 2: Configure Backend URL

Create a `.env` file in the `mobile/` folder:

```bash
# For local development (if backend runs locally)
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000

# For deployed backend (Render, Replit, etc.)
EXPO_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

> **Note:** Use your computer's local IP (not localhost) for mobile device testing. Find it with `ifconfig` (Mac/Linux) or `ipconfig` (Windows).

### Step 3: Start Development Server

**For Android/iOS (Expo Go app):**
```bash
npx expo start
```
Then scan the QR code with Expo Go app on your phone.

**For Web Browser:**
```bash
npx expo start --web
```
Opens at `http://localhost:8082`

---

## 2. Building APK for Testing

### Option A: Quick APK via EAS (Recommended)

This builds an APK in Expo's cloud servers - no Android Studio needed!

```bash
# Login to Expo
npx eas login

# Build locally 
eas build --local --platform android

# Build APK (takes 10-15 minutes)
npx eas build -p android --profile preview
```

Once complete, download the APK from the link provided and install on your Android device.

### Important: Managed Workflow

This project uses **Expo Managed Workflow** - do NOT include `android/` or `ios/` folders in your project. EAS Build generates them automatically in the cloud.

If you have `android/` or `ios/` folders, delete them:
```bash
rm -rf android ios
```

Then run EAS build as shown in Option A above.

---

## 3. Deploying to Expo / Play Store

### Step 1: Configure Your Project

Ensure `app.json` has correct values:

```json
{
  "expo": {
    "name": "My Tracker",
    "slug": "finance-tracker",
    "version": "1.0.0",
    "android": {
      "package": "com.mytracker.finance",
      "versionCode": 1
    }
  }
}
```

### Step 2: Login to EAS

```bash
npx eas login
```

### Step 3: Configure EAS Build

The `eas.json` is already configured with these profiles:

- **preview** - Builds APK for internal testing
- **production** - Builds AAB for Play Store

### Step 4: Build for Production

**For APK (internal distribution):**
```bash
npm run build:apk
# or: npx eas build -p android --profile preview
```

**For AAB (Play Store):**
```bash
npm run build:aab
# or: npx eas build -p android --profile production
```

### Step 5: Submit to Play Store (Optional)

```bash
npx eas submit -p android
```

This uploads the AAB directly to Google Play Console.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `https://api.mytracker.com` |

---

## Troubleshooting

### Web shows JSON instead of app
- Make sure you run `npx expo start --web` (not just `npx expo start`)
- The app opens at `http://localhost:`, not the root manifest

### "Network request failed" on mobile
- Ensure backend URL in `.env` is accessible from your phone
- Use your computer's IP address, not `localhost`
- Check if backend is running and CORS is configured

### EAS build fails
- Run `npx eas build:configure` to reconfigure
- Ensure you're logged in: `npx eas whoami`

### Metro bundler errors
- Clear cache: `npx expo start --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run web` | Start web version |
| `npm run build:apk` | Build APK via EAS |
| `npm run build:aab` | Build AAB for Play Store |
| `npx expo start --clear` | Start with cleared cache |

---

## Backend Deployment

Before the mobile app works, deploy the backend:

1. **Replit**: Click "Publish" in the top right
2. **Render**: Connect GitHub repo and deploy as Web Service

Then update `EXPO_PUBLIC_API_URL` with the deployed URL.
