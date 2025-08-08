"use client"
import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import axios from 'axios'
import { setAuthData, setError as setAuthError } from '@/redux/features/authSlice'
import { BASE_URL, PRODUCT, LOGIN_KEY, LOGIN_AS, SSO_URL } from "@/utils/constants"
import Image from "next/image"
import { clearIndexedDB } from '@/utils/helper'

// SSO Component that uses useSearchParams
const SSOContent = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")

    const handleSSOLogin = useCallback(async () => {
        try {
            // Extract query parameters - check for both formats
            const ID = searchParams.get('ID')
            const PDate = searchParams.get('PDate')
            const TradeWebUName = searchParams.get('TradeWebUName')
            const PANNo = searchParams.get('PANNo')

            let requestData: any = null

            // Check which format we have and prepare appropriate request data
            if (ID && PDate) {
                // Format 1: ID and PDate parameters
                requestData = {
                    ID: ID,
                    PDate: PDate,
                    Product: PRODUCT,
                    key: LOGIN_KEY,
                    loginAs: "C"
                }
                console.log('SSO Login request (ID/PDate format):', requestData)
            } else if (TradeWebUName && PANNo) {
                // Format 2: TradeWebUName and PANNo parameters
                requestData = {
                    TradeWebUName: TradeWebUName,
                    PANNo: PANNo,
                    Product: PRODUCT,
                    key: LOGIN_KEY,
                    loginAs: "C"
                }
                console.log('SSO Login request (TradeWebUName/PANNo format):', requestData)
            } else {
                setError('Missing required parameters. Expected either (ID & PDate) or (TradeWebUName & PANNo)')
                setIsLoading(false)
                return
            }

            // Call SSO Login API
            const response = await axios({
                method: 'post',
                url: `${BASE_URL}${SSO_URL}`,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: requestData
            })

            const data = response.data
            console.log('SSO Login response:', data)

            if (data.status && data.status_code === 200) {
                // Store auth data in Redux
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

                // Store auth data in localStorage
                localStorage.setItem('userId', data.data[0].ClientCode)
                localStorage.setItem('temp_token', data.token)
                localStorage.setItem('refreshToken', data.refreshToken)
                localStorage.setItem('tokenExpireTime', data.tokenExpireTime)
                localStorage.setItem('clientCode', data.data[0].ClientCode)
                localStorage.setItem('clientName', data.data[0].ClientName)
                localStorage.setItem('userType', data.data[0].UserType)
                localStorage.setItem('loginType', 'SSO')

                // Clean up any existing ekyc data
                clearIndexedDB();

                // Set localStorage only
                localStorage.setItem('auth_token', data.token);

                localStorage.removeItem('temp_token')

                // Navigate directly to dashboard (no OTP for SSO)
                router.push('/dashboard')
            } else {
                const errorMessage = data.message || 'SSO login failed'
                setError(errorMessage)
                dispatch(setAuthError(errorMessage))
                setIsLoading(false)
            }
        } catch (err) {
            console.error('SSO Login error:', err)
            const errorMessage = axios.isAxiosError(err)
                ? err.response?.data?.message || 'SSO login failed'
                : 'SSO login failed'

            setError(errorMessage)
            dispatch(setAuthError(errorMessage))
            setIsLoading(false)
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
                            • ?ID=...&PDate=...<br />
                            • ?TradeWebUName=...&PANNo=...
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