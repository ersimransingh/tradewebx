import { localStorageManager, STORAGE_KEYS } from './localStorageManager';
import { clearAllAuthData } from './auth';

export interface RecoveryOptions {
    autoCleanup?: boolean;
    showUserNotification?: boolean;
    redirectToLogin?: boolean;
}

export class StorageRecoveryManager {
    private static instance: StorageRecoveryManager;
    private isRecovering = false;

    static getInstance(): StorageRecoveryManager {
        if (!StorageRecoveryManager.instance) {
            StorageRecoveryManager.instance = new StorageRecoveryManager();
        }
        return StorageRecoveryManager.instance;
    }

    // Check and recover from localStorage corruption
    async checkAndRecover(options: RecoveryOptions = {}): Promise<boolean> {
        if (this.isRecovering) {
            console.log('Recovery already in progress...');
            return false;
        }

        this.isRecovering = true;

        try {
            console.log('Checking localStorage health...');
            const validation = localStorageManager.validateStorage();

            if (validation.isValid) {
                console.log('localStorage is healthy');
                return true;
            }

            console.warn('localStorage corruption detected:', validation.error);

            if (options.autoCleanup !== false) {
                await this.performRecovery(validation, options);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Recovery check failed:', error);
            return false;
        } finally {
            this.isRecovering = false;
        }
    }

    // Perform the actual recovery
    private async performRecovery(validation: any, options: RecoveryOptions): Promise<void> {
        console.log('Performing localStorage recovery...');

        try {
            // Step 1: Backup any recoverable data
            const backup = this.createBackup();

            // Step 2: Clear corrupted data
            localStorageManager.performCleanup();

            // Step 3: Restore valid data if possible
            if (backup.hasValidData) {
                this.restoreValidData(backup);
            }

            // Step 4: Clear authentication state to force re-login
            if (options.redirectToLogin !== false) {
                clearAllAuthData();
            }

            // Step 5: Show notification to user if enabled
            if (options.showUserNotification !== false) {
                this.showRecoveryNotification();
            }

            console.log('Recovery completed successfully');
        } catch (error) {
            console.error('Recovery failed:', error);
            // Last resort: clear everything
            localStorageManager.clearAll();
        }
    }

    // Create backup of potentially valid data
    private createBackup(): { hasValidData: boolean; data: Record<string, string> } {
        const backup: Record<string, string> = {};
        let hasValidData = false;

        try {
            // Backup theme and UI preferences (usually safe)
            const themeKeys = [
                'APP_METADATA_KEY',
                'THEME_COLORS_STORAGE_KEY',
                'THEME_STORAGE_KEY',
            ];

            themeKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value && this.isValidThemeData(value)) {
                    backup[key] = value;
                    hasValidData = true;
                }
            });

            // Backup user preferences that are not sensitive
            const safeKeys = [
                'language',
                'timezone',
                'dateFormat',
                'currency',
            ];

            safeKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value && this.isValidPreferenceData(value)) {
                    backup[key] = value;
                    hasValidData = true;
                }
            });
        } catch (error) {
            console.warn('Backup creation failed:', error);
        }

        return { hasValidData, data: backup };
    }

    // Restore valid data from backup
    private restoreValidData(backup: { data: Record<string, string> }): void {
        try {
            Object.entries(backup.data).forEach(([key, value]) => {
                localStorageManager.setItem(key, value);
            });
            console.log('Restored valid data from backup');
        } catch (error) {
            console.warn('Failed to restore backup data:', error);
        }
    }

    // Show recovery notification to user
    private showRecoveryNotification(): void {
        try {
            // Create a simple notification
            const notification = document.createElement('div');
            notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

            notification.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="width: 20px; height: 20px; background: #28a745; border-radius: 50%; margin-right: 8px;"></div>
          <strong>Storage Recovered</strong>
        </div>
        <p style="margin: 0; font-size: 14px; color: #6c757d;">
          Your data has been cleaned up. Please log in again.
        </p>
      `;

            document.body.appendChild(notification);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
        } catch (error) {
            console.warn('Failed to show recovery notification:', error);
        }
    }

    // Validate theme data
    private isValidThemeData(value: string): boolean {
        try {
            // Basic validation for theme data
            return typeof value === 'string' && value.length > 0 && value.length < 1000;
        } catch {
            return false;
        }
    }

    // Validate preference data
    private isValidPreferenceData(value: string): boolean {
        try {
            // Basic validation for preference data
            return typeof value === 'string' && value.length > 0 && value.length < 500;
        } catch {
            return false;
        }
    }

    // Force recovery (for manual triggers)
    async forceRecovery(): Promise<void> {
        console.log('Forcing localStorage recovery...');
        localStorageManager.performCleanup();
        clearAllAuthData();
        this.showRecoveryNotification();
    }

    // Check if recovery is needed
    isRecoveryNeeded(): boolean {
        const validation = localStorageManager.validateStorage();
        return !validation.isValid;
    }
}

// Export singleton instance
export const storageRecovery = StorageRecoveryManager.getInstance();

// Auto-recovery on page load
if (typeof window !== 'undefined') {
    // Run recovery check after a short delay to ensure app is initialized
    setTimeout(() => {
        storageRecovery.checkAndRecover({
            autoCleanup: true,
            showUserNotification: true,
            redirectToLogin: true,
        });
    }, 1000);
}
