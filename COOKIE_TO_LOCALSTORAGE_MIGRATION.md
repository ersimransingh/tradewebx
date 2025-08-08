# Cookie to localStorage Migration

## Overview
This project has been migrated from using cookies to localStorage for authentication token storage. This change was made to simplify the authentication flow and remove server-side dependencies for token management.

## Changes Made

### 1. Middleware (`src/middleware.ts`)
- Removed server-side cookie-based authentication checks
- Middleware now allows all requests and lets client-side handle authentication
- This is necessary because middleware runs on the server and cannot access localStorage

### 2. Authentication Guard (`src/components/auth/AuthGuard.tsx`)
- **NEW**: Created client-side authentication guard component
- Handles authentication checks and redirects on the client side
- Replaces the server-side middleware functionality

### 3. Auth Utilities (`src/utils/auth.ts`)
- Removed all cookie-related operations
- Now uses only localStorage for token storage and retrieval
- Updated logout function to clear only localStorage

### 4. Redux Auth Slice (`src/redux/features/authSlice.ts`)
- Updated initial state loading to use localStorage instead of cookies
- Removed cookie-based authentication checks
- Updated logout action to clear only localStorage

### 5. Authentication Forms
- **SignInForm**: Removed cookie setting, now uses only localStorage
- **OTPVerificationForm**: Removed cookie setting, now uses only localStorage
- **SSO Page**: Removed cookie setting, now uses only localStorage

### 6. API Service (`src/utils/apiService.ts`)
- Removed cookie clearing operations
- Now only clears localStorage during logout

### 7. KYC Page (`src/apppages/KycPage/account-closure/index.tsx`)
- Updated to read auth token from localStorage instead of cookies

### 8. Root Layout (`src/app/layout.tsx`)
- Added AuthGuard component to wrap all pages
- Provides client-side authentication protection

## Benefits of This Migration

1. **Simplified Architecture**: No more server-side cookie management
2. **Better Performance**: No cookie parsing on every request
3. **Cleaner Code**: Single source of truth for authentication (localStorage)
4. **Easier Testing**: Client-side authentication is easier to test
5. **Reduced Dependencies**: No need for cookie-based middleware

## Security Considerations

- localStorage is accessible via JavaScript, so ensure sensitive data is not stored
- Tokens should have appropriate expiration times
- Consider implementing token refresh mechanisms
- Use HTTPS to protect data in transit

## Testing

To test the migration:

1. Clear all browser data (cookies and localStorage)
2. Navigate to the application
3. Try to access protected routes - should redirect to login
4. Login with valid credentials - should work normally
5. Try to access auth pages while logged in - should redirect to dashboard
6. Logout - should clear localStorage and redirect to login

## Rollback Plan

If needed, the changes can be rolled back by:

1. Restoring the original middleware with cookie checks
2. Removing the AuthGuard component from the layout
3. Restoring cookie operations in auth utilities
4. Updating forms to set cookies again
5. Updating Redux slice to read from cookies

## Files Modified

- `src/middleware.ts`
- `src/utils/auth.ts`
- `src/redux/features/authSlice.ts`
- `src/components/auth/SignInForm.tsx`
- `src/components/auth/OTPVerificationForm.tsx`
- `src/app/(full-width-pages)/(auth)/sso/page.tsx`
- `src/utils/apiService.ts`
- `src/apppages/KycPage/account-closure/index.tsx`
- `src/app/layout.tsx`

## New Files Created

- `src/components/auth/AuthGuard.tsx` 