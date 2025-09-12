import axios from 'axios';
import { APP_METADATA_KEY, BASE_PATH_FRONT_END, BASE_URL } from './constants';
import { clearIndexedDB, clearLocalStorage } from './helper';
import { localStorageManager, STORAGE_KEYS } from './localStorageManager';

// Create axios instance with default config
export const api = axios.create({
  baseURL: BASE_URL + '/TradeWebAPI/api',
});

// Add request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// // Add response interceptor to handle token expiration
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Token expired or invalid
//       logout();
//       window.location.href = `${BASE_PATH_FRONT_END}/signin`;
//     }
//     return Promise.reject(error);
//   }
// );

export const logout = () => {
  // Clear all authentication data
  clearAllAuthData();
  sessionStorage.clear();
  // Redirect to login page - Next.js basePath config handles the base path automatically
  window.location.href = `${BASE_PATH_FRONT_END}/signin`;
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;

  // Check if token is expired
  // const expireTime = localStorage.getItem('tokenExpireTime');
  // if (expireTime && new Date(expireTime) < new Date()) {
  //   logout();
  //   clearIndexedDB();
  //   return false;
  // }

  return true;
};

export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export const getUserData = () => {
  return {
    clientCode: localStorage.getItem('clientCode'),
    clientName: localStorage.getItem('clientName'),
    userType: localStorage.getItem('userType'),
  };
};

export const clearAuthStorage = () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('temp_token');
  localStorage.removeItem('tokenExpireTime');
  localStorage.removeItem('clientCode');
  localStorage.removeItem('clientName');
  localStorage.removeItem('userType');
  localStorage.removeItem('loginType');

  // ekyc related states 
  localStorage.removeItem('ekyc_dynamicData');
  localStorage.removeItem('ekyc_activeTab');
  localStorage.removeItem('redirectedField');
  localStorage.removeItem('ekyc_submit');
  localStorage.removeItem('ekyc_viewMode');
  localStorage.removeItem("ekyc_viewMode_for_checker");
  localStorage.removeItem('ekyc_checker');
  clearIndexedDB();
};

// Comprehensive function to clear all authentication data
export const clearAllAuthData = () => {
  if (typeof window !== 'undefined') {
    // Use the new localStorage manager for safe clearing
    localStorageManager.clearAuthData();
    localStorageManager.clearEkycData();

    // Clear any remaining auth-related items
    localStorageManager.removeItem('KRAredirectedField');

    // Clear IndexedDB
    clearIndexedDB();

    console.log('All authentication data cleared successfully');
  }
};