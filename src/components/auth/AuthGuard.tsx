"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, clearAllAuthData } from '@/utils/auth';
import { toast } from 'react-toastify';
import { getLocalStorage } from '@/utils/helper';

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
          // Next.js basePath config handles the base path automatically
          const signInUrl = '/signin';
          // Only redirect if we're not already on the signin page
          if (pathname !== '/signin') {
            router.replace(signInUrl);
          }
          setIsChecking(false);
          setIsAuthenticated(false);
          return;
        }

        // If user is authenticated and trying to access auth pages
        if (authToken && isAuthPage) {
          // SSO page handles its own navigation after completing initialization
          // Don't redirect from SSO page to prevent interrupting its flow
          if (pathname?.startsWith('/sso')) {

            setIsChecking(false);
            setIsAuthenticated(true);
            return;
          }

          // Next.js basePath config handles the base path automatically
          const dashboardUrl = '/dashboard';
          // Only redirect if we're not already on the dashboard
          if (pathname !== '/dashboard') {
            router.replace(dashboardUrl);
          }
          setIsChecking(false);
          setIsAuthenticated(true);
          return;
        }

        // Additional security checks for authenticated users
        if (authToken && !isAuthPage) {
          // Check if token has expired by looking at tokenExpireTime
          const tokenExpireTime = getLocalStorage('tokenExpireTime');
          if (tokenExpireTime) {
            const expireDate = new Date(tokenExpireTime);
            const now = new Date();

            if (expireDate < now) {
              // Token has expired, but we have refresh token logic in apiService
              // Let the apiService handle token refresh automatically on next API call


              // Don't logout immediately - let the API interceptor handle token refresh
              // Only logout if refresh token is also missing
              const refreshToken = getLocalStorage('refreshToken');
              if (!refreshToken) {

                clearAllAuthData();
                toast.error('Session expired. Please login again.');
                const signInUrl = '/signin';
                router.replace(signInUrl);
                setIsChecking(false);
                setIsAuthenticated(false);
                return;
              }
            }
          }

          // Server-side token validation for critical routes (skip for localhost/development)
          const criticalRoutes = ['/admin', '/dashboard', '/kyc', '/ipo', '/margin-pledge'];
          const isCriticalRoute = criticalRoutes.some(route => pathname?.startsWith(route));

          if (isCriticalRoute) {
            // Skip server-side validation for localhost and development
            const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
            // const isDevelopment = process.env.NODE_ENV === 'development' ||
            //   hostname === 'localhost' ||
            //   hostname === '127.0.0.1' ||
            //   hostname === '0.0.0.0';


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
        // Next.js basePath config handles the base path automatically
        router.replace('/signin');
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
        const tokenExpireTime = getLocalStorage('tokenExpireTime');

        if (authToken && tokenExpireTime) {
          const expireDate = new Date(tokenExpireTime);
          const now = new Date();

          if (expireDate < now) {

            const refreshToken = getLocalStorage('refreshToken');
            if (!refreshToken) {

              clearAllAuthData();
              toast.error('Session expired. Please login again.');
              router.replace('/signin');
            }
            // If refresh token exists, let the API interceptor handle token refresh
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
        const tokenExpireTime = getLocalStorage('tokenExpireTime');

        if (authToken && tokenExpireTime) {
          const expireDate = new Date(tokenExpireTime);
          const now = new Date();

          if (expireDate < now) {

            const refreshToken = getLocalStorage('refreshToken');
            if (!refreshToken) {

              clearAllAuthData();
              toast.error('Session expired. Please login again.');
              router.replace('/signin');
            }
            // If refresh token exists, let the API interceptor handle token refresh
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
      // HTTPS enforcement removed - HTTP is now allowed for all hosts

      // Check for localStorage tampering
      const authToken = getLocalStorage('auth_token');
      const tokenIntegrity = getLocalStorage('auth_token_integrity');

      if (authToken && tokenIntegrity) {
        // Verify token integrity (this should be handled by the API service)
        // If integrity check fails, the API service will handle it
      }

      // Check for suspicious activity patterns
      const loginAttempts = getLocalStorage('login_attempts');
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