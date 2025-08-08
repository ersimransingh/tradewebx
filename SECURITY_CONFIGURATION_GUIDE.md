# Security Configuration Guide

## Quick Setup for Development and Testing

### 1. Development Mode Configuration

To enable development mode and allow your application to run without HTTPS restrictions, set the `NEXT_DEVELOPMENT_MODE` environment variable in your `.env` file:

```bash
# Enable development mode (allows all URLs without HTTPS restrictions)
NEXT_DEVELOPMENT_MODE=true
```

**Default Behavior:**
- If `NEXT_DEVELOPMENT_MODE` is not defined or set to `false`: HTTPS is required in production
- If `NEXT_DEVELOPMENT_MODE=true`: Allows all URLs (HTTP and HTTPS) without restrictions

### 2. Environment Variables

Add the following to your `.env` file:

```bash
# Development Mode Configuration
# Set to 'true' to enable development mode (allows all URLs without HTTPS restrictions)
# Default is 'false' or undefined
NEXT_DEVELOPMENT_MODE=false
```

### 3. Environment-Specific Configuration

The security configuration automatically adapts based on your environment:

- **Development Mode Enabled** (`NEXT_DEVELOPMENT_MODE=true`): 
  - HTTPS not required for any URL
  - All hostnames allowed without HTTPS
  - HSTS headers disabled
  - LocalStorage protection disabled
  - Security violations logged but not blocked
- **Development Mode Disabled** (`NEXT_DEVELOPMENT_MODE=false` or undefined): 
  - HTTPS required in production
  - Only specific localhost variants allowed without HTTPS
- **Production** (`NODE_ENV=production`): HTTPS required except for allowed hosts
- **Test** (`NODE_ENV=test`): HTTPS not required if development mode is enabled

### 4. Rate Limiting Configuration

Adjust rate limiting settings in `src/utils/securityConfig.ts`:

```typescript
RATE_LIMITING: {
    MAX_LOGIN_ATTEMPTS: 5,           // Number of failed login attempts
    LOCKOUT_DURATION: 15 * 60 * 1000, // Lockout duration in milliseconds (15 minutes)
    API_RATE_LIMIT: 100,             // API requests per minute
},
```

### 5. Security Headers Customization

Modify security headers in `src/utils/securityConfig.ts`:

```typescript
SECURITY_HEADERS: {
    CSP_POLICY: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
    HSTS_MAX_AGE: '31536000', // 1 year
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
},
```

## Common Configuration Scenarios

### Scenario 1: Local Development (with HTTP API calls)
```bash
# .env file
NEXT_DEVELOPMENT_MODE=true
```

### Scenario 2: Production Deployment
```bash
# .env file
NEXT_DEVELOPMENT_MODE=false
# or simply don't define it (defaults to false)
```

### Scenario 3: Testing Environment
```bash
# .env file
NEXT_DEVELOPMENT_MODE=true
NODE_ENV=test
```

## Troubleshooting

### Issue: "Security Error: HTTPS required"
**Solution**: Set `NEXT_DEVELOPMENT_MODE=true` in your `.env` file for local development

### Issue: "Too many login attempts"
**Solution**: Adjust `MAX_LOGIN_ATTEMPTS` and `LOCKOUT_DURATION` in the rate limiting configuration

### Issue: API requests blocked
**Solution**: Check if development mode is enabled and adjust rate limiting settings

### Issue: Security headers too strict
**Solution**: Modify the CSP policy in `SECURITY_HEADERS.CSP_POLICY`

### Issue: HTTP API calls failing in development
**Solution**: Enable development mode with `NEXT_DEVELOPMENT_MODE=true` in your `.env` file

## Security Considerations

⚠️ **IMPORTANT**: Never enable development mode in production environments!

### When to Use Development Mode:
- Local development and testing
- Debugging API calls to HTTP endpoints
- Testing with external HTTP services
- Development environments that don't support HTTPS

### When NOT to Use Development Mode:
- Production deployments
- Staging environments
- Any environment accessible from the internet
- When working with sensitive data

## Additional Documentation

For detailed information about development mode, see:
- [Development Mode Guide](./DEVELOPMENT_MODE_GUIDE.md) - Comprehensive guide to using development mode
- [Security Headers Implementation](./SECURITY_HEADERS_IMPLEMENTATION.md) - Details about security headers
- [Security Implementation](./SECURITY_IMPLEMENTATION.md) - Overall security implementation details 