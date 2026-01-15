# MFA Setup Flow - Complete Logic Guide

## Overview

This document explains the complete MFA (Multi-Factor Authentication) setup and verification flow. It clarifies the three distinct authentication scenarios and ensures users only set up MFA once.

---

## Authentication Response Types

The login endpoint returns ONE of three response types:

### 1. **MFA Setup Required** (`mfaSetupRequired: true`)
- **When:** User has a sensitive role (ADMIN, DOCTOR, SURGEON, NURSE) AND MFA is not enabled
- **Frontend Action:** Display `MfaSetupForm` component
- **Token:** Temporary setup token (15-minute expiry)
- **Next Step:** User scans QR code, enters verification code, completes MFA setup
- **Conditions:**
  - Applies to FIRST-TIME logins for sensitive roles
  - Applies to ALL subsequent logins until MFA is enabled
  - User CANNOT access the system without setting up MFA

```typescript
{
  mfaSetupRequired: true,
  tempToken: "eyJ...",
  message: "MFA setup is required for your role..."
}
```

### 2. **MFA Challenge Required** (`mfaRequired: true`)
- **When:** User has a sensitive role AND MFA is already enabled
- **Frontend Action:** Display `MfaVerificationForm` component
- **Token:** Temporary challenge token (10-minute expiry)
- **Next Step:** User enters 6-digit code from authenticator app
- **Conditions:**
  - ONLY shown after MFA has been successfully set up and verified
  - User cannot proceed without valid MFA code
  - Backup codes can be used instead

```typescript
{
  mfaRequired: true,
  tempToken: "eyJ...",
  message: "Please complete MFA verification..."
}
```

### 3. **Full Authentication** (Regular response)
- **When:** User has NO sensitive role OR MFA is already verified
- **Frontend Action:** Set user in store, redirect to dashboard
- **Tokens:** Full access and refresh tokens in HTTP-only cookies
- **Next Step:** User is logged in and can access the system
- **Conditions:**
  - Non-sensitive roles (PATIENT, NURSE_ASSISTANT, etc.) don't require MFA
  - Sensitive roles with completed MFA verification get full access

```typescript
{
  user: { id, email, roles, ... },
  accessToken: "eyJ...",
  refreshToken: "eyJ...",
  sessionId: "..."
}
```

---

## User Flow by Role

### Scenario 1: Non-Sensitive Role (e.g., PATIENT)
```
Login with correct credentials
  ↓
Password validated
  ↓
User doesn't have sensitive role
  ↓
Return full authentication response
  ↓
✅ Logged in, access dashboard
```

### Scenario 2: Sensitive Role - First Login (ADMIN without MFA)
```
Login with correct credentials
  ↓
Password validated
  ↓
User has sensitive role (ADMIN) + MFA not enabled
  ↓
Return mfaSetupRequired: true
  ↓
📱 Display MfaSetupForm
  ↓
User scans QR code → enters code → MFA enabled
  ↓
Backend calls authRepository.enableMfa(userId) [CRITICAL]
  ↓
✅ Logged in, redirected to admin dashboard
```

### Scenario 3: Sensitive Role - Subsequent Logins (ADMIN with MFA)
```
Login with correct credentials
  ↓
Password validated
  ↓
User has sensitive role (ADMIN) + MFA enabled
  ↓
Return mfaRequired: true
  ↓
📱 Display MfaVerificationForm
  ↓
User enters 6-digit code from authenticator app
  ↓
Code verified ✓
  ↓
✅ Logged in, redirected to admin dashboard
```

---

## Critical Logic: Preventing Repeated MFA Setup

### The Key Fix
The backend checks the **`user.mfaEnabled`** flag:

```typescript
// In auth.service.ts login method
if (hasSensitiveRole && !user.mfaEnabled) {
  // Return mfaSetupRequired IMMEDIATELY
  return {
    mfaSetupRequired: true,
    tempToken: setupToken,
    message: 'MFA setup is required...'
  };
}

// If mfaEnabled is TRUE, this block is skipped
// and the code proceeds to check for mfaRequired below
if (user.mfaEnabled) {
  // Return mfaRequired (MFA challenge for existing MFA)
  return {
    mfaRequired: true,
    tempToken: challengeToken,
    message: 'Please complete MFA verification...'
  };
}
```

### Database Update: Enabling MFA
After user successfully verifies their code during setup:

```typescript
// In mfa.service.ts - verifyMfaSetupAndCompleteLogin()
// Verify TOTP code is valid
const isValid = speakeasy.totp.verify({
  secret: user.mfaSecret,
  code: verificationCode,
  window: 2, // 60-second tolerance
});

if (!isValid) {
  throw new UnauthorizedException('Invalid MFA code');
}

// CRITICAL: Set mfaEnabled to TRUE in database
await this.authRepository.enableMfa(userId);

// Now subsequent logins will see mfaEnabled = true
// and trigger mfaRequired instead of mfaSetupRequired
```

---

## State Management

### Frontend Auth Store (Zustand)
```typescript
// Two separate MFA states - never both true
mfaSetupRequired: boolean  // User must SET UP MFA
mfaRequired: boolean       // User must VERIFY existing MFA
tempToken: string          // Temporary token for MFA endpoints

// Actions
setMfaSetupRequired(tempToken)  // Clear mfaRequired, set mfaSetupRequired
setMfaChallenge(tempToken)      // Clear mfaSetupRequired, set mfaRequired
clearMfaSetup()                 // Clear mfaSetupRequired after success
clearMfaChallenge()             // Clear mfaRequired after success
setUser(user)                   // Clear BOTH MFA flags on successful login
```

### Form Selection Logic
```typescript
// In LoginForm.tsx
if (mfaSetupRequired) {
  return <MfaSetupForm />;      // First time: scan QR code
}
if (mfaRequired) {
  return <MfaVerificationForm />; // Subsequent: enter 6-digit code
}
// Show login form
```

---

## Token Types & Security

| Token Type | Expiry | Purpose | Usage |
|-----------|--------|---------|-------|
| `access` | 24 hours | Full system access | Stored in HTTP-only cookie |
| `refresh` | 7 days | Get new access token | Stored in HTTP-only cookie |
| `mfa_challenge` | 10 minutes | Verify existing MFA | Authorization header only |
| `mfa_setup` | 15 minutes | Set up new MFA | Authorization header only |

### Backend Guard Logic
```typescript
// In jwt-auth.guard.ts
if (token.type === 'access') {
  // Allow on all endpoints
  return true;
}
if (token.type === 'mfa_challenge') {
  // Allow ONLY on @AllowMfaChallenge endpoints
  return hasDecorator(handler, ALLOW_MFA_CHALLENGE_KEY);
}
if (token.type === 'mfa_setup') {
  // Allow ONLY on @AllowMfaSetupToken endpoints
  return hasDecorator(handler, ALLOW_MFA_SETUP_TOKEN_KEY);
}
```

---

## Audit Logging

Every MFA action is logged for HIPAA compliance:

| Action | Trigger | Logged Data |
|--------|---------|------------|
| `MFA_SETUP_REQUIRED_INITIATED` | User with sensitive role without MFA logs in | User ID, role, IP address |
| `MFA_VERIFICATION_STARTED` | User enters setup flow | User ID, session ID |
| `MFA_VERIFICATION_FAILED` | Invalid TOTP code | User ID, error reason |
| `MFA_SETUP_COMPLETED` | Valid code during setup | User ID, timestamp |
| `MFA_CHALLENGE_ISSUED` | Subsequent login with enabled MFA | User ID, IP address |
| `MFA_VERIFICATION_SUCCESSFUL` | Valid code during challenge | User ID, session ID |

---

## Testing Scenarios

### Test Case 1: First Login - Sensitive Role
1. Login as `admin@nairobi-sculpt.com` / `Admin123!`
2. ✅ Should see **MfaSetupForm** (not MfaVerificationForm)
3. ✅ Should display QR code
4. Scan with authenticator app, enter code
5. ✅ Should complete setup and redirect to `/admin`

### Test Case 2: Second Login - Same User
1. Logout
2. Login as `admin@nairobi-sculpt.com` / `Admin123!`
3. ✅ Should see **MfaVerificationForm** (not MfaSetupForm)
4. ✅ QR code should NOT be visible
5. Enter 6-digit code from authenticator app
6. ✅ Should verify and redirect to `/admin`

### Test Case 3: Wrong TOTP Code
1. Enter incorrect 6-digit code
2. ✅ Should show error: "Invalid MFA code"
3. ✅ Code field should clear
4. ✅ Should allow retry

### Test Case 4: Expired Setup Token
1. Get setup token from first login
2. Wait 15 minutes
3. Try to verify with expired token
4. ✅ Should return 401 Unauthorized
5. ✅ User must login again to get new token

### Test Case 5: Backup Codes
1. During MFA setup, save backup codes
2. On second login, use backup code instead of TOTP
3. ✅ Should accept backup code as valid
4. ✅ Should mark backup code as used

---

## Common Issues & Solutions

### Issue: MFA Setup Shows Every Time User Logs In
- **Root Cause:** `mfaEnabled` flag not being set to `true` in database
- **Solution:** Verify `authRepository.enableMfa(userId)` is called in `verifyMfaSetupAndCompleteLogin()`
- **Check:** Query database: `SELECT mfaEnabled FROM "user" WHERE id = 'user-id'`

### Issue: Can't Set Up MFA After First Login
- **Root Cause:** User was allowed to log in without MFA setup on first login
- **Solution:** Ensure `mfaSetupRequired` is returned immediately on first sensitive role login (before line 145 in auth.service.ts)
- **Fix Applied:** Removed grace period logic, now requires MFA setup for all sensitive role logins

### Issue: Sees MFA Setup Form on Second Login Instead of Verification Form
- **Root Cause:** Database query not refreshing user data after `enableMfa()` call
- **Solution:** Clear user cache or refresh session after MFA setup completion
- **Check:** Verify `setUser()` is called with fresh user data including `mfaEnabled: true`

### Issue: 401 Error on MFA Verify Endpoint
- **Root Cause:** Token is not being passed in Authorization header, or token is wrong type
- **Solution:** Check `authService.completeMfaSetup()` sends `mfa_setup` token in Authorization header
- **Debug:** Open browser DevTools → Network tab → Look for Authorization header in POST request

---

## Deployment Checklist

- [ ] Backend `auth.service.ts` - MFA setup required for sensitive roles immediately
- [ ] Backend `mfa.service.ts` - `enableMfa()` called after verification
- [ ] Frontend `useAuth.ts` - Handles three response types correctly
- [ ] Frontend `auth.store.ts` - Clears MFA state flags on successful login
- [ ] Frontend forms - `MfaSetupForm` for setup, `MfaVerificationForm` for verification
- [ ] Database migrations - `mfaEnabled` column exists on users table
- [ ] Audit logging - All MFA actions logged for compliance
- [ ] Token expiry - Setup tokens (15 min), challenge tokens (10 min), access (24 hr)
- [ ] Documentation - User guide for MFA setup process

---

## References

- **TOTP Standard:** RFC 6238 (Time-based One-Time Password)
- **Library:** speakeasy (generates QR codes and verifies TOTP)
- **Window Tolerance:** 2 (±60 seconds)
- **Backup Codes:** 10 codes × 8 characters each
- **HIPAA Requirement:** All MFA actions must be audited with user ID, timestamp, IP address

