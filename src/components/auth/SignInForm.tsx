"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
// Eye icons as inline components
const EyeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.0002 13.8619C7.23361 13.8619 4.86803 12.1372 3.92328 9.70241C4.86804 7.26761 7.23361 5.54297 10.0002 5.54297C12.7667 5.54297 15.1323 7.26762 16.0771 9.70243C15.1323 12.1372 12.7667 13.8619 10.0002 13.8619ZM10.0002 4.04297C6.48191 4.04297 3.49489 6.30917 2.4155 9.4593C2.3615 9.61687 2.3615 9.78794 2.41549 9.94552C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C13.5184 15.3619 16.5055 13.0957 17.5849 9.94555C17.6389 9.78797 17.6389 9.6169 17.5849 9.45932C16.5055 6.30919 13.5184 4.04297 10.0002 4.04297ZM9.99151 7.84413C8.96527 7.84413 8.13333 8.67606 8.13333 9.70231C8.13333 10.7286 8.96527 11.5605 9.99151 11.5605H10.0064C11.0326 11.5605 11.8646 10.7286 11.8646 9.70231C11.8646 8.67606 11.0326 7.84413 10.0064 7.84413H9.99151Z"
    />
  </svg>
);

const EyeCloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.63803 3.57709C4.34513 3.2842 3.87026 3.2842 3.57737 3.57709C3.28447 3.86999 3.28447 4.34486 3.57737 4.63775L4.85323 5.91362C3.74609 6.84199 2.89363 8.06395 2.4155 9.45936C2.3615 9.61694 2.3615 9.78801 2.41549 9.94558C3.49488 13.0957 6.48191 15.3619 10.0002 15.3619C11.255 15.3619 12.4422 15.0737 13.4994 14.5598L15.3625 16.4229C15.6554 16.7158 16.1302 16.7158 16.4231 16.4229C16.716 16.13 16.716 15.6551 16.4231 15.3622L4.63803 3.57709ZM12.3608 13.4212L10.4475 11.5079C10.3061 11.5423 10.1584 11.5606 10.0064 11.5606H9.99151C8.96527 11.5606 8.13333 10.7286 8.13333 9.70237C8.13333 9.5461 8.15262 9.39434 8.18895 9.24933L5.91885 6.97923C5.03505 7.69015 4.34057 8.62704 3.92328 9.70247C4.86803 12.1373 7.23361 13.8619 10.0002 13.8619C10.8326 13.8619 11.6287 13.7058 12.3608 13.4212ZM16.0771 9.70249C15.7843 10.4569 15.3552 11.1432 14.8199 11.7311L15.8813 12.7925C16.6329 11.9813 17.2187 11.0143 17.5849 9.94561C17.6389 9.78803 17.6389 9.61696 17.5849 9.45938C16.5055 6.30925 13.5184 4.04303 10.0002 4.04303C9.13525 4.04303 8.30244 4.17999 7.52218 4.43338L8.75139 5.66259C9.1556 5.58413 9.57311 5.54303 10.0002 5.54303C12.7667 5.54303 15.1323 7.26768 16.0771 9.70249Z"
    />
  </svg>
);
import { useState, useEffect, useCallback, useRef, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthData, setError as setAuthError, setLoading } from '@/redux/features/authSlice';
import { BASE_URL, LOGIN_AS, PRODUCT, LOGIN_KEY, LOGIN_URL, BASE_PATH_FRONT_END, OTP_VERIFICATION_URL, VERSION, ACTION_NAME, ENABLE_CAPTCHA, ENABLE_FERNET, NEXT_PUBLIC_FULL_URL } from "@/utils/constants";
import Image from "next/image";
import { RootState } from "@/redux/store";
import { clearAuthStorage } from '@/utils/auth';
import Link from "next/link";
import CryptoJS from 'crypto-js';
import { isAllowedHttpHost, SECURITY_CONFIG } from '@/utils/securityConfig';
import CaptchaComponent, { CaptchaComponentRef } from './CaptchaComponent';
import { decodeFernetToken, getLocalStorage, removeLocalStorage, storeLocalStorage } from "@/utils/helper";
import AccessibleModal from "../a11y/AccessibleModal";

// Password encryption key
const passKey = "TradeWebX1234567";

// Encryption function
function Encryption(data: string) {
  const key = CryptoJS.enc.Utf8.parse(passKey);
  const iv = CryptoJS.enc.Utf8.parse(passKey);
  const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(data), key,
    {
      keySize: 128 / 8,
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
  return encrypted.toString();
}

// Interface for version updates
interface VersionItem {
  Name: string;
  Status: string;
  Message: string;
  Remark?: string;
}

// Component for the version update modal
const VersionUpdateModal = ({
  isOpen,
  onClose,
  updates,
  onConfirm,
  userType = "User", // Add userType prop to determine if user can update
  isUpdating = false, // Add loading state prop
  showUpdate = "N" // Add showUpdate prop to control button visibility
}: {
  isOpen: boolean;
  onClose: () => void;
  updates: VersionItem[];
  onConfirm: () => void;
  userType?: string;
  isUpdating?: boolean;
  showUpdate?: string;
}) => {
  if (!isOpen) return null;

  // Check if there are any mandatory updates
  const hasMandatoryUpdates = updates.some(update => update.Status === 'M');

  // Determine if user has update rights based on UserType from login response
  // "user" = normal user (cannot update), anything else = admin (can update)
  const canUpdate = userType.toLowerCase() !== "user";

  // Show update button only if ShowUpdate is 'Y' AND user can update
  const showUpdateButton = showUpdate === 'Y' && canUpdate;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[300]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-[500px]" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h4 className="text-xl font-semibold mb-4 dark:text-white">
          {hasMandatoryUpdates ? 'Mandatory Update Required' : 'Update Available'}
        </h4>

        {/* Show different messages based on update type and user rights */}
        {hasMandatoryUpdates && !canUpdate && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <strong>Access Restricted:</strong>
                <p className="mt-1">You cannot login as User until the mandatory system update is completed. Please contact your administrator to update the system.</p>
              </div>
            </div>
          </div>
        )}

        {hasMandatoryUpdates && canUpdate && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <strong>Important:</strong>
                <p className="mt-1">This update is mandatory and must be installed before you can access the system.</p>
              </div>
            </div>
          </div>
        )}

        {!hasMandatoryUpdates && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
            <strong>Optional Update Available:</strong> You can choose to install now or continue and update later.
          </div>
        )}

        <div className="mb-6">
          {updates.map((update, index) => (
            <div key={index} className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="font-medium text-gray-800 dark:text-white">{update.Name}</div>
              <div className="text-gray-600 dark:text-gray-300">{update.Message}</div>
              {update?.Remark && (
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 p-2 rounded">
                  <span className="font-medium">Remarks:</span> {update.Remark}
                </div>
              )}
              <div className="text-sm mt-1">
                <span className={`px-2 py-0.5 rounded-full ${update.Status === 'M' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {update.Status === 'M' ? 'Mandatory' : 'Optional'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          {/* For users with mandatory updates: Only OK button that closes modal and prevents login */}
          {hasMandatoryUpdates && !showUpdateButton ? (
            <button
              onClick={onClose}
              disabled={isUpdating}
              className={`px-6 py-2 rounded-md font-medium ${isUpdating
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600'
                } text-white`}
            >
              OK
            </button>
          ) : (
            <>
              {/* For optional updates or when update button is not shown: Show skip/cancel option */}
              {!hasMandatoryUpdates && (
                <button
                  onClick={onClose}
                  disabled={isUpdating}
                  className={`px-4 py-2 rounded-md ${isUpdating
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                    : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                    }`}
                >
                  OK
                </button>
              )}

              {/* Update button - only if ShowUpdate is 'Y' AND user can update */}
              {showUpdateButton && (
                <button
                  onClick={onConfirm}
                  disabled={isUpdating}
                  className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${isUpdating
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                    } text-white`}
                >
                  {isUpdating ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </div>
                  ) : (
                    hasMandatoryUpdates ? 'Update Now' : 'Update'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Component for the message modal
const MessageModal = ({
  isOpen,
  onClose,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}) => {
      const titleId = useId();
      const descriptionId = useId();
  return (
     <AccessibleModal
            isOpen={isOpen}
            onDismiss={onClose}
            labelledBy={titleId}
            describedBy={descriptionId}
            role={'alertdialog'}
            className="bg-white p-6 shadow-theme-lg max-w-md w-full rounded-lg"
            closeOnOverlayClick={false}
        >
       
    <div className="fixed inset-0 flex items-center justify-center z-[300]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-[500px]" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h4 id={titleId} className="text-xl font-semibold mb-4 dark:text-white">
          Important Message
        </h4>

        <div className="mb-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p id={descriptionId} className="whitespace-pre-wrap">{message}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md font-medium bg-blue-500 hover:bg-blue-600 text-white"
          >
            OK
          </button>
        </div>
      </div>
    </div>
    </AccessibleModal>
  );
};

export default function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { companyInfo, status, encPayload } = useSelector((state: RootState) => state.common);

  // State for version update modal
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionUpdates, setVersionUpdates] = useState<VersionItem[]>([]);
  const [version, setVersion] = useState("2.0.0.0"); // Default version
  const [loginData, setLoginData] = useState<any>(null); // Store login data for navigation after version check
  const [isUpdating, setIsUpdating] = useState(false); // Loading state for update button
  const [currentUserType, setCurrentUserType] = useState<string>(""); // Store user type from login response
  const [isCaptchaValid, setIsCaptchaValid] = useState(false); // CAPTCHA validation state
  const captchaRef = useRef<CaptchaComponentRef>(null); // Reference to CAPTCHA component

  // State for message modal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [firstLogin,setFirstLogin] = useState<string>("");

  // Check version function inside component using useCallback to memoize
  const checkVersion = useCallback(async (token?: string) => {
    console.log('checkVersion function called with token:', token ? 'Present' : 'Not provided');
    try {
      const xmlData = `
        <dsXml>
          <J_Ui>"ActionName":"${ACTION_NAME}","Option":"CheckVersion","RequestFrom":"W","ReportDisplay":"A"</J_Ui>
          <Sql/>
          <X_Filter>
              <ApplicationName>${ACTION_NAME}</ApplicationName>
              <Product>${PRODUCT}</Product>
              <Version>${VERSION}</Version>
          </X_Filter>
          <J_Api>"UserId":"", "UserType":"User"</J_Api>
        </dsXml>
      `;

      console.log('Sending version check request to:', BASE_URL + OTP_VERIFICATION_URL);
      console.log('Version check XML data:', xmlData);

      const headers: any = {
        'Content-Type': 'application/xml',
      };

      // Add token to headers if provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Token added to version check request headers');
      }

      const response = await axios({
        method: 'post',
        url: BASE_URL + OTP_VERIFICATION_URL,
        data: xmlData,
        headers: headers
      });

      console.log('Version check response:', response.data);
      const shouldDecode = ENABLE_FERNET && encPayload;
      const data = shouldDecode ? decodeFernetToken(response.data.data) : response.data;
      console.log('Version check decoded data:', data);
      return data;
    } catch (error) {
      console.error('Version check error:', error);
      throw error;
    }
  }, [version, encPayload]);

  // Function to proceed with navigation after version check
  const proceedAfterVersionCheck = useCallback((dataToUse?: any, forceLogout = false) => {
    const currentLoginData = dataToUse || loginData;
    if (!currentLoginData) return;

    // Debug: Log the navigation flow
    console.log('proceedAfterVersionCheck called:', {
      loginType: currentLoginData.LoginType,
      forceLogout,
      hasTempToken: !!getLocalStorage('temp_token')
    });

    // If forceLogout is true (mandatory update for non-admin users), clear everything and stay on login
    if (forceLogout) {

      // function Clear all auth data
      clearAuthStorage();

      // Reset form
      setUserId("");
      setPassword("");
      setError("System update required. Please contact your administrator to update the system.");
      dispatch(setAuthError("System update required. Please contact your administrator to update the system."));
      return;
    }

    if (currentLoginData.LoginType === "2FA") {
      console.log('Redirecting to OTP verification');
      router.push('/otp-verification');
    } else {
      // Set localStorage only
      storeLocalStorage('auth_token', currentLoginData.token);
      // Only store refresh token if it's not empty
      if (currentLoginData.refreshToken) {
        storeLocalStorage('refreshToken', currentLoginData.refreshToken);
      }
      storeLocalStorage('tokenExpireTime', currentLoginData.tokenExpireTime);
      storeLocalStorage('temp_token', '');
      console.log('Redirecting to dashboard');
      if(firstLogin === 'Y') router.push('/changepassword');
      else router.push('/dashboard');
    }
  }, [loginData, router, dispatch]);

  // Function to perform version check after successful login
  const performVersionCheckAfterLogin = useCallback(async (currentLoginData: any) => {
    console.log('performVersionCheckAfterLogin called with:', currentLoginData);
    try {
      console.log('Calling checkVersion API...');
      // Get token from loginData or from localStorage (temp_token or auth_token)
      const token = currentLoginData?.token || getLocalStorage('temp_token') || getLocalStorage('auth_token');
      console.log('Using token for version check:', token ? 'Present' : 'Not found');
      const result = await checkVersion(token);

      // Check if the API returned success: false
      if (result.success === false) {
        // Show error message and don't let user proceed
        const errorMessage = result.message || 'Version check failed. Please try again.';
        setError(errorMessage);
        dispatch(setAuthError(errorMessage));

        // Only clear auth storage for non-2FA users
        // For 2FA users, keep the temp_token so they can proceed to OTP verification
        if (currentLoginData.LoginType !== "2FA") {
          clearAuthStorage();
          // Reset form state
          setUserId("");
          setPassword("");
          setLoginData(null);
        } else {
          // For 2FA users, allow them to proceed even if version check fails
          console.log('Version check failed for 2FA user, but allowing to proceed to OTP verification');
          proceedAfterVersionCheck(currentLoginData);
        }
        return; // Don't proceed to next page
      }

      if (result.success && result.data?.rs0?.length > 0) {
        setVersionUpdates(result.data.rs0);
        setShowVersionModal(true);
      } else {
        // No updates available, proceed with navigation
        proceedAfterVersionCheck(currentLoginData);
      }
    } catch (error) {
      console.error('Failed to check version:', error);
      // Show error message and don't let user proceed in case of network/other errors
      const errorMessage = 'Failed to check version. Please check your connection and try again.';
      setError(errorMessage);
      dispatch(setAuthError(errorMessage));

      // Only clear auth storage for non-2FA users
      // For 2FA users, keep the temp_token so they can proceed to OTP verification
      if (currentLoginData.LoginType !== "2FA") {
        clearAuthStorage();
        // Reset form state
        setUserId("");
        setPassword("");
        setLoginData(null);
      } else {
        // For 2FA users, allow them to proceed even if version check fails
        console.log('Version check error for 2FA user, but allowing to proceed to OTP verification');
        proceedAfterVersionCheck(currentLoginData);
      }
    }
  }, [checkVersion, proceedAfterVersionCheck, dispatch]);

  // Handle message modal close
  const handleMessageModalClose = useCallback(() => {
    setShowMessageModal(false);
    setMessageContent("");

    // After message modal is closed, proceed with the normal flow
    if (loginData) {
      // Check for version updates if UserType is 'branch' (regardless of ShowUpdate value)
      if (loginData.userType && loginData.userType.toLowerCase() === 'branch') {
        console.log('Message modal closed, UserType is branch, checking for version updates');
        performVersionCheckAfterLogin(loginData);
      } else {
        console.log('Message modal closed, UserType is not branch, proceeding directly');
        proceedAfterVersionCheck(loginData);
      }
    }
  }, [loginData, performVersionCheckAfterLogin, proceedAfterVersionCheck]);

  // Handle the update confirmation
  const handleUpdateConfirm = useCallback(async () => {
    setIsUpdating(true); // Start loading
    setError(""); // Clear any previous errors

    try {
      // Get token from loginData or from localStorage (temp_token or auth_token)
      const token = loginData?.token || getLocalStorage('temp_token') || getLocalStorage('auth_token');
      console.log('Using token for version update:', token ? 'Present' : 'Not found');

      const xmlData = `
        <dsXml>
          <J_Ui>"ActionName":"${ACTION_NAME}","Option":"UpdateVersion","RequestFrom":"W","ReportDisplay":"A"</J_Ui>
          <Sql/>
          <X_Filter>
              <ApplicationName>TradeWeb</ApplicationName>
              <Product>${PRODUCT}</Product>
              <Version>${VERSION}</Version>
          </X_Filter>
          <J_Api>"UserId":"", "UserType":"User"</J_Api>
        </dsXml>
      `;

      const headers: any = {
        'Content-Type': 'application/xml',
      };

      // Add token to headers if provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Token added to version update request headers');
      }

      console.log('Sending version update request to:', BASE_URL + OTP_VERIFICATION_URL);
      console.log('Version update XML data:', xmlData);

      const response = await axios({
        method: 'post',
        url: BASE_URL + OTP_VERIFICATION_URL,
        data: xmlData,
        headers: headers
      });

      console.log('Version update response:', response.data);

      // Check if update was successful
      const shouldDecode = ENABLE_FERNET && encPayload;
      const data = shouldDecode ? decodeFernetToken(response.data.data) : response.data;
      if (data.success) {
        setShowVersionModal(false);
        setIsUpdating(false);
        // Only proceed with login after successful update
        proceedAfterVersionCheck(loginData);
      } else {
        // Update failed, show error but keep modal open for mandatory updates
        const hasMandatoryUpdates = versionUpdates.some(update => update.Status === 'M');
        setIsUpdating(false);
        if (hasMandatoryUpdates) {
          setError("Update failed. Please try again or contact support.");
        } else {
          // For optional updates, allow proceeding even if update fails
          setShowVersionModal(false);
          proceedAfterVersionCheck(loginData);
        }
      }
    } catch (error) {
      console.error('Failed to update version:', error);

      // Check if it's a mandatory update
      const hasMandatoryUpdates = versionUpdates.some(update => update.Status === 'M');
      setIsUpdating(false);

      if (hasMandatoryUpdates) {
        // For mandatory updates, don't proceed if update fails
        setError("Update failed. Please check your connection and try again.");
      } else {
        // For optional updates, allow proceeding even if update fails
        setShowVersionModal(false);
        proceedAfterVersionCheck(loginData);
      }
    }
  }, [version, loginData, proceedAfterVersionCheck, versionUpdates]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // CAPTCHA validation
    if (ENABLE_CAPTCHA && !isCaptchaValid) {
      setError('Please complete the security verification');
      dispatch(setAuthError('Please complete the security verification'));
      return;
    }

    setIsLoading(true);
    dispatch(setLoading(true));
    dispatch(setAuthError(null));

    // HTTPS enforcement removed - HTTP is now allowed for all hosts

    // Security: Rate limiting check
    const loginAttempts = getLocalStorage('login_attempts') || '0';
    const attemptCount = parseInt(loginAttempts);
    const lastAttemptTime = getLocalStorage('last_login_attempt') || '0';
    const timeSinceLastAttempt = Date.now() - parseInt(lastAttemptTime);

    if (attemptCount >= SECURITY_CONFIG.RATE_LIMITING.MAX_LOGIN_ATTEMPTS &&
      timeSinceLastAttempt < SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION) {
      setError(`Too many login attempts. Please try again in ${Math.ceil(SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION / 60000)} minutes.`);
      dispatch(setAuthError(`Too many login attempts. Please try again in ${Math.ceil(SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION / 60000)} minutes.`));
      setIsLoading(false);
      dispatch(setLoading(false));
      return;
    }

    // Update login attempts
    storeLocalStorage('login_attempts', (attemptCount + 1).toString());
    storeLocalStorage('last_login_attempt', Date.now().toString());

    const xmlData = `<dsXml>
    <J_Ui>"ActionName":"${ACTION_NAME}","Option":"Login"</J_Ui>
    <Sql/>
    <X_Filter></X_Filter>
    <X_Data>
        <UserId>${userId}</UserId>
        
        <EPassword>${Encryption(password)}</EPassword>
        
        <Product>${PRODUCT}</Product>
        <ICPV></ICPV>
        <Feature></Feature>
    </X_Data>
    <J_Api>"UserId":"", "UserType":"User"</J_Api>
    </dsXml>`;
    // remove Key as requested "<Key>${LOGIN_KEY}</Key>" 

    console.log('Login XML Data:', xmlData);

    try {
      const response = await axios({
        method: 'post',
        url: BASE_URL + OTP_VERIFICATION_URL,
        data: xmlData,
        headers: {
          'Content-Type': 'application/xml',
        }
      });

      // Check both ENABLE_FERNET constant and encPayload from Redux state
      const shouldDecode = ENABLE_FERNET && encPayload;
      const data = shouldDecode ? decodeFernetToken(response.data.data) : response.data;
      console.log('Login Response:', data);
      console.log('Response status:', data.status);
      console.log('Response token:', data.token);
      console.log('Response refreshToken:', data.refreshToken);
      const userFirstLogin = data.data[0].FirstLogin
      setFirstLogin(userFirstLogin)
      

      if (data.status) {
        // Security: Validate response integrity
        if (!data.token) {
          setError('Invalid response from server');
          dispatch(setAuthError('Invalid response from server'));
          return;
        }

        // Store the UserType from login response
        const userType = data.data[0].UserType;
        setCurrentUserType(userType);

        // Check for ShowUpdate and Message fields
        const showUpdate = data.data[0].ShowUpdate;
        const message = data.data[0].Message;

        console.log('Login response fields:', {
          showUpdate,
          message,
          userType
        });

        // Refresh token should be available for all users in the login response
        // For 2FA users, refresh token will also be available after OTP verification
        if (!data.refreshToken) {
          console.warn('No refresh token received in login response');
          // Don't throw error, just log warning as refresh token might come later for 2FA users
        }

        // Security: Clear login attempts on successful login
        removeLocalStorage('login_attempts');
        removeLocalStorage('last_login_attempt');

        // Handle different field names based on UserType
        const clientCode = data.data[0].ClientCode || data.data[0].UserCode || '';
        const clientName = data.data[0].ClientName || data.data[0].UserName || '';

        // Debug logging to help identify field mapping issues
        console.log('Login response data:', data.data[0]);
        console.log('UserType:', userType);
        console.log('Mapped clientCode:', clientCode);
        console.log('Mapped clientName:', clientName);

        // Validate that we have the required data
        if (!clientCode || !clientName) {
          console.error('Missing required user data:', { clientCode, clientName, userType });
          setError('Invalid user data received from server');
          dispatch(setAuthError('Invalid user data received from server'));
          return;
        }

        dispatch(setAuthData({
          userId: userId,
          token: data.token,
          refreshToken: data.refreshToken || '', // Use empty string if refreshToken not present
          tokenExpireTime: data.tokenExpireTime,
          clientCode: clientCode,
          clientName: clientName,
          userType: userType,
          loginType: data.data[0].LoginType,
          firstLogin:userFirstLogin,
        }));

        // Security: Store tokens with integrity checks (handled by API service)
        storeLocalStorage('userId', userId);
        storeLocalStorage('temp_token', data.token);

        // Debug: Log token storage
        console.log('Token stored for 2FA:', {
          tempToken: data.token ? 'Stored' : 'Missing',
          loginType: data.data[0].LoginType,
          userType: userType
        });

        // Store refreshToken if it exists (for all users)
        if (data.refreshToken) {
          storeLocalStorage('refreshToken', data.refreshToken);
          console.log('Refresh token stored successfully:', data.refreshToken);
        } else {
          console.warn('No refresh token in login response');
        }
        storeLocalStorage('tokenExpireTime', data.tokenExpireTime);
        storeLocalStorage('clientCode', clientCode);
        storeLocalStorage('clientName', clientName);
        storeLocalStorage('userType', userType);
        storeLocalStorage('loginType', data.data[0].LoginType);
        storeLocalStorage('firstLogin', userFirstLogin);
        removeLocalStorage("ekyc_dynamicData");
        removeLocalStorage("ekyc_activeTab");

        // Store login data for navigation after version check
        const currentLoginData = {
          token: data.token,
          refreshToken: data.refreshToken || '', // Use empty string if refreshToken not present
          tokenExpireTime: data.tokenExpireTime,
          LoginType: data.data[0].LoginType,
          showUpdate: showUpdate, // Store showUpdate value for later use
          userType: userType, // Store userType for later use
          firstLogin:userFirstLogin
        };
        
        setLoginData(currentLoginData);

        // Handle message modal first if there's a message
        if (message && message.trim() !== '') {
          console.log('Showing message modal with content:', message);
          setMessageContent(message);
          setShowMessageModal(true);
          return; // Don't proceed with version check or navigation yet
        }

        // Check for version updates if UserType is 'branch' (regardless of ShowUpdate value)
        if (userType.toLowerCase() === 'branch') {
          console.log('UserType is branch, checking for version updates');
          await performVersionCheckAfterLogin(currentLoginData);
        } else {
          console.log('UserType is not branch, proceeding directly without version check');
          // No version check needed, proceed directly
          proceedAfterVersionCheck(currentLoginData);
        }
      } else {
        dispatch(setAuthError(data.message || 'Login failed'));
        setError(data.message || 'Login failed');

        // Refresh CAPTCHA on login failure
        console.log('Login failed, checking CAPTCHA refresh conditions:', {
          ENABLE_CAPTCHA,
          hasCaptchaRef: !!captchaRef.current
        });
        if (ENABLE_CAPTCHA && captchaRef.current) {
          console.log('Refreshing CAPTCHA after login failure');
          captchaRef.current.refreshCaptcha();
        }
      }
    } catch (err) {
      console.log(err);
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || 'An error occurred during login'
        : 'An error occurred during login';

      dispatch(setAuthError(errorMessage));
      setError(errorMessage);

      // Refresh CAPTCHA on login error
      console.log('Login error, checking CAPTCHA refresh conditions:', {
        ENABLE_CAPTCHA,
        hasCaptchaRef: !!captchaRef.current
      });
      if (ENABLE_CAPTCHA && captchaRef.current) {
        console.log('Refreshing CAPTCHA after login error');
        captchaRef.current.refreshCaptcha();
      }
    } finally {
      dispatch(setLoading(false));
      setIsLoading(false);
    }
  };

  // Effect to clear local storage and redirect to sign-in if clearLocalStorage param is true
  useEffect(() => {
    if (searchParams.get('clearLocalStorage') === 'true') {
      localStorage.clear();
      // Next.js basePath config handles the base path automatically
      router.replace('/signin');
    }
  }, [searchParams]);

  const usernameFieldId = useId();
  const passwordFieldId = useId();
  const errorAlertId = useId();

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto ">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div>
            {companyInfo?.CompanyLogo && (
              <div className="flex justify-center mb-5">
                <Image
                  src={companyInfo.CompanyLogo.startsWith('data:')
                    ? companyInfo.CompanyLogo
                    : `data:image/png;base64,${companyInfo.CompanyLogo}`}
                  alt="Company Logo"
                  width={64}
                  height={64}
                  className="h-20 w-auto object-contain drop-shadow-md"
                  priority
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-black dark:text-white text-center mb-2">
              {companyInfo?.CompanyName?.trim() || ""}
            </h1>
          </div>

          <div className="my-5 border-b border-gray-200 dark:border-gray-700"></div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Welcome Back
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Sign in to continue to your account</p>
          </div>

          {error && (
            <div
              id={errorAlertId}
              className="mb-5 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center"
              role="alert"
              aria-live="assertive"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor={usernameFieldId} className="text-gray-700 dark:text-gray-300 font-medium">Username</Label>
              <Input
                id={usernameFieldId}
                name="username"
                type="text"
                autoComplete="username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your username"
                className="mt-1 transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <Label htmlFor={passwordFieldId} className="text-gray-700 dark:text-gray-300 font-medium">Password</Label>
              <div className="relative mt-1">
                <Input
                  id={passwordFieldId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 right-4 top-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </button>
              </div>
            </div>

            {ENABLE_CAPTCHA && (
              <CaptchaComponent
                ref={captchaRef}
                onCaptchaChange={setIsCaptchaValid}
                className="mt-4"
              />
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-all duration-200 mt-2"
              disabled={isLoading || (ENABLE_CAPTCHA && !isCaptchaValid)}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : ENABLE_CAPTCHA && !isCaptchaValid ? 'Complete verification to continue' : 'Sign in'}
            </Button>
          </form>
          <div className="flex justify-center items-center mt-2">
            <Link href="/forgot-password">Forgot Password?</Link>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Version {VERSION}
        </div>
        <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: '11px' }}>Powered By:</span>
          <a href="https://www.secmark.in" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
            <Image src={`${NEXT_PUBLIC_FULL_URL}/images/secmarklogo.png`} alt="Tradesoft" width={90} height={90} />
          </a>
        </div>
      </div>

      {/* Version Update Modal */}
      <VersionUpdateModal
        isOpen={showVersionModal}
        onClose={() => {
          setShowVersionModal(false);
          setIsUpdating(false); // Reset loading state when modal closes

          // Check if there are mandatory updates and user doesn't have update rights
          const hasMandatoryUpdates = versionUpdates.some(update => update.Status === 'M');
          // Use UserType from login response to determine user permissions
          // "user" = normal user (cannot update), anything else = admin (can update)
          const canUpdate = currentUserType.toLowerCase() !== "user";
          // Show update button only if ShowUpdate is 'Y' AND user can update
          const showUpdateButton = loginData?.showUpdate === 'Y' && canUpdate;

          if (hasMandatoryUpdates && !showUpdateButton) {
            // Force logout for users with mandatory updates who cannot update
            proceedAfterVersionCheck(loginData, true);
          } else {
            // Allow normal login flow for optional updates or admin users
            proceedAfterVersionCheck(loginData);
          }
        }}
        updates={versionUpdates}
        onConfirm={handleUpdateConfirm}
        userType={currentUserType}
        isUpdating={isUpdating}
        showUpdate={loginData?.showUpdate || 'N'}
      />

      {/* Message Modal */}
      <MessageModal
        isOpen={showMessageModal}
        onClose={handleMessageModalClose}
        message={messageContent}
      />
    </div>
  );
}
