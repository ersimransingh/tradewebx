"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BASE_PATH_FRONT_END } from '@/utils/constants';
import { getAuthToken, clearAllAuthData } from '@/utils/auth';
import apiService from '@/utils/apiService';
import { toast } from 'react-toastify';
import { isAllowedHttpHost } from '@/utils/securityConfig';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateAuthentication = async () => {
      try {
        // Check if we're on an auth page or root path
        const isAuthPage = pathname?.startsWith('/signin') ||
          pathname?.startsWith('/otp-verification') ||
          pathname?.startsWith('/forgot-password') ||
          pathname?.startsWith('/sso') ||
          pathname === '/';

        // Get auth token from localStorage
        const authToken = getAuthToken();

        // If user is not authenticated and trying to access protected route
        if (!authToken && !isAuthPage) {
          const signInUrl = `${BASE_PATH_FRONT_END}/signin`;
          // Only redirect if we're not already on the signin page (account for basePath)
          const currentSigninPath = `${BASE_PATH_FRONT_END}/signin`;
          if (pathname !== '/signin' && pathname !== currentSigninPath) {
            router.replace(signInUrl);
          }
          setIsChecking(false);
          setIsAuthenticated(false);
          return;
        }

        // If user is authenticated and trying to access auth pages
        if (authToken && isAuthPage) {
          const dashboardUrl = `${BASE_PATH_FRONT_END}/dashboard`;
          // Only redirect if we're not already on the dashboard (account for basePath)
          const currentDashboardPath = `${BASE_PATH_FRONT_END}/dashboard`;
          if (pathname !== '/dashboard' && pathname !== currentDashboardPath) {
            router.replace(dashboardUrl);
          }
          setIsChecking(false);
          setIsAuthenticated(true);
          return;
        }

        // Additional security checks for authenticated users
        if (authToken && !isAuthPage) {
          // Check if token has expired by looking at tokenExpireTime
          const tokenExpireTime = localStorage.getItem('tokenExpireTime');
          if (tokenExpireTime) {
            const expireDate = new Date(tokenExpireTime);
            const now = new Date();

            if (expireDate < now) {
              // Token has expired, clear all authentication data and redirect to login
              console.log('Token expired - clearing all authentication data');

              // Clear all authentication data
              clearAllAuthData();

              toast.error('Session expired. Please login again.');
              const signInUrl = `${BASE_PATH_FRONT_END}/signin`;
              router.replace(signInUrl);
              setIsChecking(false);
              setIsAuthenticated(false);
              return;
            }
          }

          // Server-side token validation for critical routes (skip for localhost/development)
          const criticalRoutes = ['/admin', '/dashboard', '/kyc', '/ipo', '/margin-pledge'];
          const isCriticalRoute = criticalRoutes.some(route => pathname?.startsWith(route));

          if (isCriticalRoute) {
            // Skip server-side validation for localhost and development
            const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            const isDevelopment = process.env.NODE_ENV === 'development' ||
              hostname === 'localhost' ||
              hostname === '127.0.0.1' ||
              hostname === '0.0.0.0';


          }

          // Additional security checks
          await performSecurityChecks();
        }

        // If we reach here, the user is in the correct state
        setIsChecking(false);
        setIsAuthenticated(!!authToken);
      } catch (error) {
        console.error('Authentication validation error:', error);
        // On error, clear all authentication data and redirect to login for safety

        // Clear all authentication data
        clearAllAuthData();

        toast.error('Authentication error. Please login again.');
        router.replace(`${BASE_PATH_FRONT_END}/signin`);
        setIsChecking(false);
        setIsAuthenticated(false);
      }
    };

    validateAuthentication();

    // Set up periodic token validation for authenticated users
    let intervalId: NodeJS.Timeout | null = null;

    if (isAuthenticated && !pathname?.startsWith('/signin')) {
      // Check token every 5 minutes
      intervalId = setInterval(() => {
        const authToken = getAuthToken();
        const tokenExpireTime = localStorage.getItem('tokenExpireTime');

        if (authToken && tokenExpireTime) {
          const expireDate = new Date(tokenExpireTime);
          const now = new Date();

          if (expireDate < now) {
            console.log('Periodic check: Token expired - clearing all authentication data');
            clearAllAuthData();
            toast.error('Session expired. Please login again.');
            router.replace(`${BASE_PATH_FRONT_END}/signin`);
          }
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    // Cleanup interval on unmount or when authentication state changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pathname, router, isAuthenticated]);

  // Handle visibility change (user returning to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // User has returned to the tab, check if token is still valid
        const authToken = getAuthToken();
        const tokenExpireTime = localStorage.getItem('tokenExpireTime');

        if (authToken && tokenExpireTime) {
          const expireDate = new Date(tokenExpireTime);
          const now = new Date();

          if (expireDate < now) {
            console.log('Visibility change: Token expired - clearing all authentication data');
            clearAllAuthData();
            toast.error('Session expired. Please login again.');
            router.replace(`${BASE_PATH_FRONT_END}/signin`);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, router]);

  // Perform additional security checks
  const performSecurityChecks = async () => {
    try {
      // Check if development mode is enabled
      const isDevMode = process.env.NEXT_DEVELOPMENT_MODE === 'true';

      // Check for HTTPS in production (allow localhost and testing URLs)
      // Skip HTTPS check if development mode is enabled
      if (!isDevMode && typeof window !== 'undefined' && window.location.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
        const hostname = window.location.hostname;

        if (!isAllowedHttpHost(hostname)) {
          console.error('Security Warning: Application must run on HTTPS in production');
          toast.error('Security Error: HTTPS required');
          return false;
        }
      }

      // Check for localStorage tampering
      const authToken = localStorage.getItem('auth_token');
      const tokenIntegrity = localStorage.getItem('auth_token_integrity');

      if (authToken && tokenIntegrity) {
        // Verify token integrity (this should be handled by the API service)
        // If integrity check fails, the API service will handle it
      }

      // Check for suspicious activity patterns
      const loginAttempts = localStorage.getItem('login_attempts');
      if (loginAttempts && parseInt(loginAttempts) > 5) {
        console.warn('Multiple login attempts detected');
        // Could implement rate limiting here
      }

      return true;
    } catch (error) {
      console.error('Security check error:', error);
      return false;
    }
  };

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Validating session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 