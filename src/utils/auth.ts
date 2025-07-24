import axios from 'axios';
import { APP_METADATA_KEY, BASE_PATH_FRONT_END, BASE_URL } from './constants';
import { clearIndexedDB, clearLocalStorage } from './helper';

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
  // Clear cookies
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  // Clear all localStorage data
  clearLocalStorage();
  clearIndexedDB();
  // Redirect to login page
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