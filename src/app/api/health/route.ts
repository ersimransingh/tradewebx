import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // Get environment variables
        const envVars = {
            NODE_ENV: process.env.NODE_ENV,
            NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
            NEXT_PUBLIC_PATH_URL: process.env.NEXT_PUBLIC_PATH_URL,
            NEXT_PUBLIC_LOGIN_URL: process.env.NEXT_PUBLIC_LOGIN_URL,
            NEXT_PUBLIC_OTP_VERIFICATION_URL: process.env.NEXT_PUBLIC_OTP_VERIFICATION_URL,
            NEXT_PUBLIC_PRODUCT: process.env.NEXT_PUBLIC_PRODUCT,
            NEXT_PUBLIC_ACTION_NAME: process.env.NEXT_PUBLIC_ACTION_NAME,
            NEXT_PUBLIC_APP_METADATA_KEY: process.env.NEXT_PUBLIC_APP_METADATA_KEY,
            NEXT_PUBLIC_LOGIN_AS_OPTIONS: process.env.NEXT_PUBLIC_LOGIN_AS_OPTIONS,
            NEXT_PUBLIC_LOGIN_KEY: process.env.NEXT_PUBLIC_LOGIN_KEY,
            NEXT_PUBLIC_LOGIN_AS: process.env.NEXT_PUBLIC_LOGIN_AS,
            NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
            NEXT_PUBLIC_SSO_URL: process.env.NEXT_PUBLIC_SSO_URL,
            NEXT_PUBLIC_ENABLE_CAPTCHA: process.env.NEXT_PUBLIC_ENABLE_CAPTCHA,
            NEXT_DEVELOPMENT_MODE: process.env.NEXT_DEVELOPMENT_MODE,
        };

        // Test API endpoint construction
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
        const API_ENDPOINT = BASE_URL ? `${BASE_URL}/TradeWebAPI/api` : 'undefined';

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            envVars,
            apiEndpoint: API_ENDPOINT,
            headers: {
                host: request.headers.get('host'),
                'user-agent': request.headers.get('user-agent'),
                'x-forwarded-for': request.headers.get('x-forwarded-for'),
                'x-real-ip': request.headers.get('x-real-ip'),
            }
        });
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
