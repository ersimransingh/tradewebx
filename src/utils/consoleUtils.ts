// Console utilities for debugging and fixing localStorage issues
// These functions are available in the browser console

import { localStorageManager } from './localStorageManager';
import { storageRecovery } from './storageRecovery';
import { clearAllAuthData } from './auth';

// Make utilities available globally for console access
if (typeof window !== 'undefined') {
    (window as any).TradeWebX = {
        // localStorage utilities
        clearStorage: () => {
            console.log('Clearing all localStorage...');
            localStorageManager.clearAll();
            console.log('localStorage cleared successfully');
        },

        clearAuth: () => {
            console.log('Clearing authentication data...');
            clearAllAuthData();
            console.log('Authentication data cleared successfully');
        },

        checkHealth: () => {
            console.log('Checking localStorage health...');
            const validation = localStorageManager.validateStorage();
            console.log('Health check result:', validation);
            return validation;
        },

        recover: async () => {
            console.log('Performing localStorage recovery...');
            await storageRecovery.forceRecovery();
            console.log('Recovery completed');
        },

        inspectStorage: () => {
            console.log('Current localStorage contents:');
            const items: Record<string, string> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    const value = localStorage.getItem(key);
                    items[key] = value ? (value.length > 100 ? `${value.substring(0, 100)}...` : value) : '';
                }
            }
            console.table(items);
            return items;
        },

        // Quick fixes
        fixConnectionReset: async () => {
            console.log('Fixing ERR_CONNECTION_RESET by clearing corrupted localStorage...');
            try {
                // Check health first
                const health = localStorageManager.validateStorage();
                if (!health.isValid) {
                    console.log('Corruption detected, performing recovery...');
                    await storageRecovery.forceRecovery();
                } else {
                    console.log('No corruption detected, clearing auth data anyway...');
                    clearAllAuthData();
                }
                console.log('Fix completed. Please refresh the page and try again.');
            } catch (error) {
                console.error('Fix failed:', error);
            }
        },

        // Development helpers
        enableDebugMode: () => {
            localStorage.setItem('debug_mode', 'true');
            console.log('Debug mode enabled');
        },

        disableDebugMode: () => {
            localStorage.removeItem('debug_mode');
            console.log('Debug mode disabled');
        },

        // Version info
        version: '1.0.0',
    };

    console.log('TradeWebX utilities loaded. Use TradeWebX.help() for available commands.');

    // Add help function
    (window as any).TradeWebX.help = () => {
        console.log(`
TradeWebX Console Utilities:

Storage Management:
  TradeWebX.clearStorage()     - Clear all localStorage
  TradeWebX.clearAuth()        - Clear only authentication data
  TradeWebX.checkHealth()      - Check localStorage health
  TradeWebX.recover()          - Perform automatic recovery
  TradeWebX.inspectStorage()   - Show all localStorage items

Quick Fixes:
  TradeWebX.fixConnectionReset() - Fix ERR_CONNECTION_RESET issues

Development:
  TradeWebX.enableDebugMode()  - Enable debug mode
  TradeWebX.disableDebugMode() - Disable debug mode

Info:
  TradeWebX.version           - Current version
  TradeWebX.help()           - Show this help
    `);
    };
}
