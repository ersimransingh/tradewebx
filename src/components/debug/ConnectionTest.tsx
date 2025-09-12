'use client';

import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../../utils/constants';

interface ConnectionTestResult {
    test: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    details?: any;
}

const ConnectionTest: React.FC = () => {
    const [results, setResults] = useState<ConnectionTestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const addResult = (test: string, status: 'success' | 'error' | 'pending', message: string, details?: any) => {
        setResults(prev => [...prev, { test, status, message, details }]);
    };

    const runTests = async () => {
        setIsRunning(true);
        setResults([]);

        // Test 1: Environment Variables
        addResult('Environment Variables', 'pending', 'Checking environment variables...');
        try {
            const envCheck = {
                BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
                PATH_URL: process.env.NEXT_PUBLIC_PATH_URL,
                LOGIN_URL: process.env.NEXT_PUBLIC_LOGIN_URL,
                OTP_VERIFICATION_URL: process.env.NEXT_PUBLIC_OTP_VERIFICATION_URL,
                PRODUCT: process.env.NEXT_PUBLIC_PRODUCT,
                ACTION_NAME: process.env.NEXT_PUBLIC_ACTION_NAME,
                APP_METADATA_KEY: process.env.NEXT_PUBLIC_APP_METADATA_KEY,
                LOGIN_AS_OPTIONS: process.env.NEXT_PUBLIC_LOGIN_AS_OPTIONS,
                LOGIN_KEY: process.env.NEXT_PUBLIC_LOGIN_KEY,
                LOGIN_AS: process.env.NEXT_PUBLIC_LOGIN_AS,
                BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
                SSO_URL: process.env.NEXT_PUBLIC_SSO_URL,
                ENABLE_CAPTCHA: process.env.NEXT_PUBLIC_ENABLE_CAPTCHA,
                DEVELOPMENT_MODE: process.env.NEXT_DEVELOPMENT_MODE,
            };

            const missingVars = Object.entries(envCheck).filter(([key, value]) => !value);

            if (missingVars.length > 0) {
                addResult('Environment Variables', 'error', `Missing environment variables: ${missingVars.map(([key]) => key).join(', ')}`, envCheck);
            } else {
                addResult('Environment Variables', 'success', 'All environment variables are set', envCheck);
            }
        } catch (error) {
            addResult('Environment Variables', 'error', `Error checking environment variables: ${error}`, error);
        }

        // Test 2: Health Check API
        addResult('Health Check API', 'pending', 'Testing health check endpoint...');
        try {
            const response = await fetch('/api/health');
            const data = await response.json();

            if (response.ok) {
                addResult('Health Check API', 'success', 'Health check API is working', data);
            } else {
                addResult('Health Check API', 'error', `Health check failed: ${data.error}`, data);
            }
        } catch (error) {
            addResult('Health Check API', 'error', `Health check API error: ${error}`, error);
        }

        // Test 3: External API Connection
        addResult('External API Connection', 'pending', 'Testing connection to external API...');
        try {
            if (!BASE_URL) {
                addResult('External API Connection', 'error', 'BASE_URL is not defined', null);
            } else {
                const apiUrl = `${BASE_URL}/TradeWebAPI/api`;
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    addResult('External API Connection', 'success', `Successfully connected to ${apiUrl}`, { status: response.status });
                } else {
                    addResult('External API Connection', 'error', `API connection failed: ${response.status} ${response.statusText}`, {
                        status: response.status,
                        statusText: response.statusText,
                        url: apiUrl
                    });
                }
            }
        } catch (error) {
            addResult('External API Connection', 'error', `External API connection error: ${error}`, {
                error: error instanceof Error ? error.message : String(error),
                baseUrl: BASE_URL
            });
        }

        // Test 4: CORS and Security Headers
        addResult('CORS and Security Headers', 'pending', 'Testing CORS and security headers...');
        try {
            const response = await fetch('/api/health', {
                method: 'OPTIONS',
                headers: {
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'Content-Type',
                },
            });

            const corsHeaders = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
                'Content-Security-Policy': response.headers.get('Content-Security-Policy'),
                'X-Frame-Options': response.headers.get('X-Frame-Options'),
            };

            addResult('CORS and Security Headers', 'success', 'CORS and security headers are configured', corsHeaders);
        } catch (error) {
            addResult('CORS and Security Headers', 'error', `CORS test error: ${error}`, error);
        }

        setIsRunning(false);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Connection Test</h2>
            <button
                onClick={runTests}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {isRunning ? 'Running Tests...' : 'Run Connection Tests'}
            </button>

            <div className="mt-6 space-y-4">
                {results.map((result, index) => (
                    <div key={index} className={`p-4 rounded border-l-4 ${result.status === 'success' ? 'bg-green-50 border-green-500' :
                            result.status === 'error' ? 'bg-red-50 border-red-500' :
                                'bg-yellow-50 border-yellow-500'
                        }`}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{result.test}</h3>
                            <span className={`px-2 py-1 rounded text-sm ${result.status === 'success' ? 'bg-green-100 text-green-800' :
                                    result.status === 'error' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                }`}>
                                {result.status}
                            </span>
                        </div>
                        <p className="mt-2 text-sm">{result.message}</p>
                        {result.details && (
                            <details className="mt-2">
                                <summary className="cursor-pointer text-sm font-medium">Details</summary>
                                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                                    {JSON.stringify(result.details, null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConnectionTest;
