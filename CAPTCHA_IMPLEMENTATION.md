# CAPTCHA Implementation Guide

## Overview

The TradeWebX application now includes a configurable CAPTCHA system on the sign-in page to enhance security and prevent automated attacks.

## Features

- **Simple Addition CAPTCHA**: Easy-to-solve addition problems (numbers 1-10) for better user experience
- **Anti-Copy Protection**: Text is non-selectable and copy-paste is disabled
- **Visual Distortion**: Individual characters have random rotations, colors, and styling to prevent OCR attacks
- **Background Noise**: Random dots and gradients to confuse automated systems
- **Rate Limiting**: Refresh button has cooldown to prevent rapid-fire attempts
- **Visual Design**: Clean, accessible design that matches the application theme
- **Configurable**: Can be enabled/disabled via environment variable
- **Responsive**: Works on all device sizes
- **Accessibility**: Proper labeling and keyboard navigation support

## Configuration

### Environment Variable

The CAPTCHA feature is controlled by the `NEXT_PUBLIC_ENABLE_CAPTCHA` environment variable:

```bash
# Enable CAPTCHA (default behavior)
NEXT_PUBLIC_ENABLE_CAPTCHA=true

# Disable CAPTCHA
NEXT_PUBLIC_ENABLE_CAPTCHA=false

# Not set - CAPTCHA will be enabled by default
```

### Default Behavior

- If the environment variable is not set, CAPTCHA is **enabled by default**
- If the environment variable is set to `'false'` (string), CAPTCHA is disabled
- Any other value (including `true`, `1`, etc.) will enable CAPTCHA

## Implementation Details

### Components

1. **CaptchaComponent** (`src/components/auth/CaptchaComponent.tsx`)
   - Generates random math problems
   - Handles user input validation
   - Provides refresh functionality
   - Visual feedback for correct/incorrect answers

2. **SignInForm** (`src/components/auth/SignInForm.tsx`)
   - Integrates CAPTCHA component
   - Validates CAPTCHA before form submission
   - Disables submit button until CAPTCHA is completed

### Security Features

- **Anti-Copy Protection**: Text cannot be selected, copied, or pasted
- **Visual Distortion**: Each character has unique styling (rotation, color, size) to prevent OCR
- **Background Noise**: Random visual elements to confuse automated systems
- **Rate Limiting**: Refresh button has 500ms cooldown to prevent rapid attempts
- **Input Validation**: Real-time validation with visual feedback
- **Session Management**: CAPTCHA state is managed per session
- **Accessibility**: Screen reader friendly with proper ARIA labels

## User Experience

### When CAPTCHA is Enabled

1. User enters username and password
2. User must solve a simple addition problem (e.g., "5 + 3") shown in the CAPTCHA
3. Numbers are between 1-10 for easy mental calculation
4. Each character has unique visual styling to prevent automated reading
5. Submit button is disabled until CAPTCHA is completed correctly
6. Visual feedback shows if the answer is correct or incorrect
7. User can refresh the CAPTCHA if needed (with 500ms cooldown)
8. Answer field prevents pasting for additional security

### When CAPTCHA is Disabled

1. Normal login flow without CAPTCHA
2. No additional security verification required

## Customization

### Styling

The CAPTCHA component uses Tailwind CSS classes and can be customized by modifying the component styles in `CaptchaComponent.tsx`.

### Difficulty

To change the difficulty level, modify the `generateCaptcha` function in `CaptchaComponent.tsx`:

```typescript
// Current: Simple addition with numbers 1-10
const num1 = Math.floor(Math.random() * 10) + 1;
const num2 = Math.floor(Math.random() * 10) + 1;
const answer = num1 + num2;
const question = `${num1} + ${num2}`;

// For harder problems (larger numbers):
const num1 = Math.floor(Math.random() * 20) + 1;
const num2 = Math.floor(Math.random() * 20) + 1;

// For different operations:
const operators = ['+', '-', '×'];
const operator = operators[Math.floor(Math.random() * operators.length)];
```

### CAPTCHA Types

To implement different types of CAPTCHA (image-based, reCAPTCHA, etc.), create a new component and replace the `CaptchaComponent` import in `SignInForm.tsx`.

## Testing

### Manual Testing

1. Set `NEXT_PUBLIC_ENABLE_CAPTCHA=true` in your environment
2. Navigate to the sign-in page
3. Verify CAPTCHA appears and functions correctly
4. Test with incorrect answers
5. Test refresh functionality
6. Set `NEXT_PUBLIC_ENABLE_CAPTCHA=false` and verify CAPTCHA is hidden

### Automated Testing

The CAPTCHA component includes proper test IDs and can be tested with automated testing frameworks.

## Security Considerations

- CAPTCHA is client-side generated and validated
- For production use, consider implementing server-side CAPTCHA validation
- CAPTCHA should be used in conjunction with other security measures (rate limiting, HTTPS, etc.)
- Consider implementing progressive security (CAPTCHA only after failed attempts)

## Troubleshooting

### CAPTCHA Not Appearing

1. Check environment variable configuration
2. Verify the component is properly imported
3. Check browser console for errors

### CAPTCHA Not Working

1. Ensure JavaScript is enabled
2. Check for CSS conflicts
3. Verify component state management

### Performance Issues

1. CAPTCHA generation is lightweight and shouldn't cause performance issues
2. If needed, implement lazy loading for CAPTCHA component 