export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
export const PATH_URL = process.env.NEXT_PUBLIC_PATH_URL
export const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL
export const PRODUCT = process.env.NEXT_PUBLIC_PRODUCT
export const OTP_VERIFICATION_URL = process.env.NEXT_PUBLIC_OTP_VERIFICATION_URL
export const APP_METADATA_KEY = process.env.NEXT_PUBLIC_APP_METADATA_KEY;
export const ACTION_NAME = process.env.NEXT_PUBLIC_ACTION_NAME
export const LOGIN_AS_OPTIONS = process.env.NEXT_PUBLIC_LOGIN_AS_OPTIONS
export const LOGIN_KEY = process.env.NEXT_PUBLIC_LOGIN_KEY
export const LOGIN_AS = process.env.NEXT_PUBLIC_LOGIN_AS
export const BASE_PATH_FRONT_END = process.env.NEXT_PUBLIC_BASE_PATH || ''
export const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL || '/TradeWebAPI/api/Main/Login_SSO'
export const VERSION = "2.0.0.1"
export const ENABLE_CAPTCHA = process.env.NEXT_PUBLIC_ENABLE_CAPTCHA !== 'false' // Default to true if not set to 'false'
export const ENABLE_FERNET = process.env.NEXT_PUBLIC_ENABLE_FERNET || false
export const SECURE_STORAGE_KEY = 'secure_data' // Single key for all encrypted localStorage data