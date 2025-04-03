"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setAuthData, setError as setAuthError, setLoading } from '@/redux/features/authSlice';
import { BASE_URL, LOGIN_AS, PRODUCT, LOGIN_KEY, LOGIN_URL } from "@/utils/constants";
import Image from "next/image";

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
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5">
            <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Sign In
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your username"
                  {...{} as any}
                />
              </div>

              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    {...{} as any}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                  </span>
                </div>
              </div>

              {/* Only show the dropdown if login options are available */}
              {loginAsOptions.length > 0 && (
                <div>
                  <Label>Login As</Label>
                  <select
                    className="w-full px-4 py-2 border rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <div className="flex justify-end items-center mr-2 mb-2">
        <div style={{}} className="flex items-center gap-2">
          <span className=" text-gray-500" style={{ fontSize: '10px' }}>Powered By :</span>
          <a href="https://www.secmark.in" target="_blank" rel="noopener noreferrer">
            <Image src="/images/secmarklogo.png" alt="Tradesoft" width={100} height={100} />
          </a>
        </div>
      </div>
    </div>
  );
}
