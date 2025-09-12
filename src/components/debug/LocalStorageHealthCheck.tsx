'use client';

import React, { useState, useEffect } from 'react';
import { localStorageManager } from '../../utils/localStorageManager';
import { storageRecovery } from '../../utils/storageRecovery';

interface HealthCheckResult {
    isValid: boolean;
    error?: string;
    needsCleanup?: boolean;
    details?: any;
}

const LocalStorageHealthCheck: React.FC = () => {
    const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [storageItems, setStorageItems] = useState<Record<string, string>>({});

    const checkHealth = async () => {
        setIsChecking(true);
        try {
            const validation = localStorageManager.validateStorage();
            setHealthStatus(validation);

            // Also get current storage items for inspection
            const items: Record<string, string> = {};
            const keys = [
                'userId', 'auth_token', 'temp_token', 'refreshToken', 'tokenExpireTime',
                'clientCode', 'clientName', 'userType', 'loginType', 'ekyc_dynamicData',
                'ekyc_activeTab', 'ekyc_checker', 'login_attempts', 'last_login_attempt'
            ];

            keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    items[key] = value.length > 100 ? `${value.substring(0, 100)}...` : value;
                }
            });

            setStorageItems(items);
        } catch (error) {
            setHealthStatus({
                isValid: false,
                error: `Health check failed: ${error}`,
                needsCleanup: true,
            });
        } finally {
            setIsChecking(false);
        }
    };

    const performRecovery = async () => {
        setIsRecovering(true);
        try {
            await storageRecovery.forceRecovery();
            // Re-check health after recovery
            setTimeout(() => {
                checkHealth();
            }, 1000);
        } catch (error) {
            console.error('Recovery failed:', error);
        } finally {
            setIsRecovering(false);
        }
    };

    const clearAllData = () => {
        if (confirm('Are you sure you want to clear all localStorage data? This will log you out.')) {
            localStorageManager.clearAll();
            checkHealth();
        }
    };

    const clearAuthData = () => {
        if (confirm('Are you sure you want to clear authentication data? This will log you out.')) {
            localStorageManager.clearAuthData();
            checkHealth();
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">LocalStorage Health Check</h2>

            <div className="space-y-4">
                {/* Health Status */}
                <div className={`p-4 rounded border-l-4 ${healthStatus?.isValid ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Health Status</h3>
                        <span className={`px-2 py-1 rounded text-sm ${healthStatus?.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {healthStatus?.isValid ? 'Healthy' : 'Unhealthy'}
                        </span>
                    </div>
                    {healthStatus?.error && (
                        <p className="mt-2 text-sm text-red-600">{healthStatus.error}</p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                    <button
                        onClick={checkHealth}
                        disabled={isChecking}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                        {isChecking ? 'Checking...' : 'Check Health'}
                    </button>

                    {healthStatus?.needsCleanup && (
                        <button
                            onClick={performRecovery}
                            disabled={isRecovering}
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                        >
                            {isRecovering ? 'Recovering...' : 'Auto Recover'}
                        </button>
                    )}

                    <button
                        onClick={clearAuthData}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                        Clear Auth Data
                    </button>

                    <button
                        onClick={clearAllData}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Clear All Data
                    </button>
                </div>

                {/* Storage Items */}
                <div className="mt-6">
                    <h3 className="font-semibold mb-2">Current Storage Items</h3>
                    <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
                        {Object.keys(storageItems).length === 0 ? (
                            <p className="text-gray-500 text-sm">No storage items found</p>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(storageItems).map(([key, value]) => (
                                    <div key={key} className="text-sm">
                                        <span className="font-mono text-blue-600">{key}:</span>
                                        <span className="ml-2 text-gray-700">{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recovery Instructions */}
                <div className="mt-6 p-4 bg-blue-50 rounded">
                    <h3 className="font-semibold text-blue-800 mb-2">Recovery Instructions</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• If you see "Unhealthy" status, click "Auto Recover" to fix corrupted data</li>
                        <li>• If the app is not working, try "Clear Auth Data" to force re-login</li>
                        <li>• As a last resort, use "Clear All Data" to reset everything</li>
                        <li>• The recovery system will automatically preserve your theme preferences</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LocalStorageHealthCheck;
