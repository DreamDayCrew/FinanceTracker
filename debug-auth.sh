#!/bin/bash

# Test script to debug the authentication flow issue

echo "🧪 Testing Set Password Endpoint Issue"
echo "======================================="
echo ""

# First, let's request an OTP
echo "📧 Step 1: Request OTP..."
OTP_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"Test User"}')

echo "OTP Response: $OTP_RESPONSE"
echo ""

echo "ℹ️  Note: Since we're testing locally, check the server logs for the OTP code"
echo "   Then manually call the verify-otp endpoint with the OTP from logs"
echo ""

echo "📱 Step 2: You need to:"
echo "   1. Check server logs for OTP code"  
echo "   2. Call verify-otp with that code"
echo "   3. Use the returned access token for set-password"
echo ""

echo "Example verify-otp call:"
echo 'curl -X POST http://localhost:5000/api/auth/verify-otp \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"email":"test@example.com","otp":"123456"}'"'"''
echo ""

echo "Example set-password call:"
echo 'curl -X POST http://localhost:5000/api/auth/set-password \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \'
echo '  -d '"'"'{"password":"test123"}'"'"''