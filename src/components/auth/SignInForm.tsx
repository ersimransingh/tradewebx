"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthData, setError as setAuthError, setLoading } from '@/redux/features/authSlice';
import { BASE_URL, LOGIN_AS, PRODUCT, LOGIN_KEY, LOGIN_URL } from "@/utils/constants";
import Image from "next/image";
import { RootState } from "@/redux/store";

// Default options to use if JSON file is not available
const DEFAULT_LOGIN_OPTIONS = [];

export default function SignInForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginAsOptions, setLoginAsOptions] = useState(DEFAULT_LOGIN_OPTIONS);
  const { companyInfo, status } = useSelector((state: RootState) => state.common);
  // Initialize with first option's values
  const [selectedName, setSelectedName] = useState("");
  const [selectedLoginAs, setSelectedLoginAs] = useState("");
  const [selectedLoginKey, setSelectedLoginKey] = useState("");

  // Load login options from JSON file with fallback
  useEffect(() => {
    const loadLoginOptions = async () => {
      try {
        // Dynamically import the JSON file
        const options = await import("../../../loginOptions.json")
          .then(module => module.default)
          .catch(() => {
            console.log("Login options JSON file not found, using defaults");
            return DEFAULT_LOGIN_OPTIONS;
          });

        setLoginAsOptions(options);

        // Set initial selected values from the first option
        if (options && options.length > 0) {
          setSelectedName(options[0].name || "");
          setSelectedLoginAs(options[0].loginAs || "");
          setSelectedLoginKey(options[0].key || "");
        }
      } catch (error) {
        console.error("Error loading login options:", error);
        // Keep using the default options that were set initially
      }
    };

    loadLoginOptions();
  }, []);

  const handleLoginAsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = e.target.selectedIndex;
    const selectedOption = loginAsOptions[selectedIndex];
    setSelectedName(selectedOption?.name || "");
    setSelectedLoginAs(selectedOption?.loginAs || "");
    setSelectedLoginKey(selectedOption?.key || "");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    dispatch(setLoading(true));
    dispatch(setAuthError(null));

    // Use fallback values if no login options are available
    const params = {
      userId: userId,
      password: password,
      key: loginAsOptions.length > 0 ? selectedLoginKey : LOGIN_KEY,
      loginAs: loginAsOptions.length > 0 ? selectedLoginAs : LOGIN_AS,
      product: PRODUCT
    };

    try {
      const response = await axios({
        method: 'post',
        url: BASE_URL + LOGIN_URL,
        params: params,
        headers: {
          'Content-Type': 'application/json',
        },
        data: ''  // Empty body as requested
      });

      const data = response.data;
      console.log(data);

      if (data.status) {
        dispatch(setAuthData({
          userId: userId,
          token: data.token,
          tokenExpireTime: data.tokenExpireTime,
          clientCode: data.data[0].ClientCode,
          clientName: data.data[0].ClientName,
          userType: data.data[0].UserType,
          loginType: data.data[0].LoginType,
        }));

        localStorage.setItem('userId', userId);
        localStorage.setItem('temp_token', data.token);
        localStorage.setItem('tokenExpireTime', data.tokenExpireTime);
        localStorage.setItem('clientCode', data.data[0].ClientCode);
        localStorage.setItem('clientName', data.data[0].ClientName);
        localStorage.setItem('userType', data.data[0].UserType);
        localStorage.setItem('loginType', data.data[0].LoginType);

        router.push('/otp-verification');
      } else {
        dispatch(setAuthError(data.message || 'Login failed'));
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.log(err);
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.message || 'An error occurred during login'
        : 'An error occurred during login';

      dispatch(setAuthError(errorMessage));
      setError(errorMessage);
    } finally {
      dispatch(setLoading(false));
      setIsLoading(false);
    }
  };

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
            <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label className="text-gray-700 dark:text-gray-300 font-medium">Username</Label>
              <Input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your username"
                className="mt-1 transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                {...{} as any}
              />
            </div>

            <div>
              <Label className="text-gray-700 dark:text-gray-300 font-medium">Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="transition-all duration-200 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900"
                  {...{} as any}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </span>
              </div>
            </div>

            {/* Only show the dropdown if login options are available */}
            {loginAsOptions.length > 0 && (
              <div>
                <Label className="text-gray-700 dark:text-gray-300 font-medium">Login As</Label>
                <select
                  className="w-full mt-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  value={selectedName}
                  onChange={handleLoginAsChange}
                >
                  {loginAsOptions.map((option: any, index: number) => (
                    <option
                      key={index}
                      value={option.name}
                    >
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-all duration-200 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
      <div className="flex justify-end items-center p-4">
        <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: '11px' }}>Powered By:</span>
          <a href="https://www.secmark.in" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-80">
            <Image src="/images/secmarklogo.png" alt="Tradesoft" width={90} height={90} />
          </a>
        </div>
      </div>
    </div>
  );
}
