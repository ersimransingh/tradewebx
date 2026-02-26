// Function to get the base URL dynamically from the browser
const getBaseURL = (): string => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
        // Get the origin (protocol + hostname + port) from the current URL
        return window.location.origin;
    }
    // Fallback to environment variable for server-side rendering
    return process.env.NEXT_PUBLIC_BASE_URL || '';
}

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
export const PATH_URL = process.env.NEXT_PUBLIC_PATH_URL
export const UPLOAD_FILE_URL = process.env.NEXT_PUBLIC_UPLOAD_FILE_URL || '/TPLUSNARIMAN/api/ThirdPartyService/ImportLargeFile'
export const UPDATE_IMPORT_SEQ_URL = process.env.NEXT_PUBLIC_UPDATE_IMPORT_SEQ_URL || '/TPLUSNARIMAN/api/ThirdPartyService/UpdateImportSeqFilter'
export const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL
export const PRODUCT = process.env.NEXT_PUBLIC_PRODUCT
export const OTP_VERIFICATION_URL = process.env.NEXT_PUBLIC_OTP_VERIFICATION_URL
export const APP_METADATA_KEY = process.env.NEXT_PUBLIC_APP_METADATA_KEY;
export const ACTION_NAME = process.env.NEXT_PUBLIC_ACTION_NAME
export const LOGIN_AS_OPTIONS = process.env.NEXT_PUBLIC_LOGIN_AS_OPTIONS
export const LOGIN_KEY = process.env.NEXT_PUBLIC_LOGIN_KEY
export const LOGIN_AS = process.env.NEXT_PUBLIC_LOGIN_AS
export const BASE_PATH_FRONT_END = process.env.NEXT_PUBLIC_BASE_PATH || ''
export const NEXT_PUBLIC_FULL_URL = getBaseURL() + (process.env.NEXT_PUBLIC_BASE_PATH || '')
export const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || '/TradeWebAPI/api/Main/Login_SSO'
export const VERSION = "2.0.0.1"
export const ENABLE_CAPTCHA = process.env.NEXT_PUBLIC_ENABLE_CAPTCHA !== 'false' // Default to true if not set to 'false'
export const ENABLE_FERNET = process.env.NEXT_PUBLIC_ENABLE_FERNET || true
export const SECURE_STORAGE_KEY = 'secure_data' // Single key for all encrypted localStorage data
export const SECURITY_LIBRARY: 'fernetsdk' | 'cryptojssdk' = 'fernetsdk' // Options: 'fernetsdk', 'cryptojssdk'
export const LOGIN_OPTION = process.env.NEXT_PUBLIC_LOGIN_OPTION || 'Login'