"use client"
import React, { useEffect, useState, useCallback, Suspense, useLayoutEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { logout, setAuthData, setError as setAuthError, setFinalAuthData } from '@/redux/features/authSlice'
import { BASE_URL, OTP_VERIFICATION_URL, ACTION_NAME } from "@/utils/constants"
import { clearIndexedDB, removeLocalStorage, storeLocalStorage, decodeFernetToken } from '@/utils/helper'
import { fetchMenuItems } from '@/redux/features/menuSlice'
import { fetchInitializeLogin } from '@/redux/features/common/commonSlice'
import { useAppDispatch } from '@/redux/hooks'

// SSO Component that uses useSearchParams
const SSOContent = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useAppDispatch()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const hasAttemptedLogin = useRef(false)

    // Reset any stale session immediately so other effects don't fire with old tokens
    useLayoutEffect(() => {
        dispatch(logout())
    }, [dispatch])

    const handleSSOLogin = useCallback(async () => {
        // Prevent duplicate API calls
        if (hasAttemptedLogin.current) {
            return;
        }

        hasAttemptedLogin.current = true;

        try {
            // Extract all query parameters dynamically
            let requestData: any = null
            let xDataContent = ""
            const queryParams: { [key: string]: string } = {}

            // Collect all query parameters
            searchParams.forEach((value, key) => {
                queryParams[key] = value
                xDataContent += `<${key}>${value}</${key}>`
            })



            // Check if we have any parameters
            if (Object.keys(queryParams).length === 0) {
                setError('No query parameters found')
                setIsLoading(false)
                hasAttemptedLogin.current = false; // Reset so user can retry
                return
            }

            // Construct XML payload
            const xmlData = `<dsXml>
                                <J_Ui>"ActionName": "${ACTION_NAME}","Option":"LoginSSO"</J_Ui>
                                <Sql/>
                                <X_Filter></X_Filter>
                                <X_Data>
                                    ${xDataContent}
                                </X_Data>
                                <J_Api>"UserId":"", "UserType":"User"</J_Api>
                            </dsXml>`

            requestData = xmlData

            // PUT THIS 3 SECONDS IF IT IS NOT WORKING CHAGNE BY SIMRAN SINGH
            await new Promise(resolve => setTimeout(resolve, 200))
            // Call SSO Login API
            const response = await axios({
                method: 'post',
                url: `${BASE_URL}${OTP_VERIFICATION_URL}`,
                headers: {
                    'Content-Type': 'application/xml',
                },
                data: requestData
            })



            // Handle encrypted response if needed
            let data = response.data

            // For SSO, we don't know in advance if data is encrypted
            // Check if response.data.data is a string - if so, it's encrypted and needs decryption
            if (typeof data.data === 'string') {

                try {
                    data = decodeFernetToken(data.data)

                } catch (error) {
                    console.error('Failed to decrypt SSO response:', error)
                    throw new Error('Failed to decrypt encrypted response')
                }
            } else {

            }

            if (data.status && data.status_code === 200) {
                // Store auth data in localStorage
                storeLocalStorage('userId', data.data[0].ClientCode)
                storeLocalStorage('temp_token', data.token)
                storeLocalStorage('refreshToken', data.refreshToken)
                storeLocalStorage('tokenExpireTime', data.tokenExpireTime)
                storeLocalStorage('clientCode', data.data[0].ClientCode)
                storeLocalStorage('clientName', data.data[0].ClientName)
                storeLocalStorage('userType', data.data[0].UserType)
                storeLocalStorage('loginType', 'SSO')

                // Clean up any existing ekyc data
                clearIndexedDB();

                // Set localStorage only
                storeLocalStorage('auth_token', data.token);

                removeLocalStorage('temp_token')

                // Update Redux auth state after tokens are in place
                dispatch(setAuthData({
                    userId: data.data[0].ClientCode,
                    token: data.token,
                    refreshToken: data.refreshToken,
                    tokenExpireTime: data.tokenExpireTime,
                    clientCode: data.data[0].ClientCode,
                    clientName: data.data[0].ClientName,
                    userType: data.data[0].UserType,
                    loginType: "SSO", // Set as SSO login type
                }))
                dispatch(setFinalAuthData({
                    token: data.token,
                    refreshToken: data.refreshToken,
                    tokenExpireTime: data.tokenExpireTime,
                    clientCode: data.data[0].ClientCode,
                    clientName: data.data[0].ClientName,
                    userType: data.data[0].UserType,
                }))

                // Wait for critical initialization to complete before navigating
                // This ensures SSO remains standalone and dashboard doesn't load prematurely

                await dispatch(fetchInitializeLogin()).unwrap();


                await dispatch(fetchMenuItems()).unwrap();


                // Navigate directly to dashboard (no OTP for SSO)
                router.push('/dashboard')
            } else {
                const errorMessage = data.message || 'SSO login failed'
                setError(errorMessage)
                dispatch(setAuthError(errorMessage))
                setIsLoading(false)
                hasAttemptedLogin.current = false; // Reset so user can retry
            }
        } catch (err) {
            console.error('SSO Login error:', err)
            const errorMessage = axios.isAxiosError(err)
                ? err.response?.data?.message || 'SSO login failed'
                : 'SSO login failed'

            setError(errorMessage)
            dispatch(setAuthError(errorMessage))
            setIsLoading(false)
            hasAttemptedLogin.current = false; // Reset so user can retry
        }
    }, [searchParams, dispatch, router])

    useEffect(() => {
        // Start SSO login process when component mounts
        handleSSOLogin()
    }, [handleSSOLogin])

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div className="text-center">
                        <div className="mb-4">
                            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            SSO Login Failed
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {error}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <strong>Supported URL formats:</strong><br />
                            • Any query parameters will be sent to the API<br />
                            • Example: ?param1=value1&param2=value2
                        </div>
                        <button
                            onClick={() => router.push('/signin')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Single Sign-On
                    </h1>
                    <div className="flex flex-col items-center">
                        {/* Loading Spinner */}
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">
                            Authenticating your account...
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                            Please wait while we log you in
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Loading fallback component
const SSOFallback = () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Single Sign-On
                </h1>
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                        Loading...
                    </p>
                </div>
            </div>
        </div>
    </div>
)

// Main SSO component with Suspense wrapper
const SSO = () => {
    return (
        <Suspense fallback={<SSOFallback />}>
            <SSOContent />
        </Suspense>
    )
}

export default SSO 
