import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        // Skip logging if disabled via env flag
        if (process.env.NEXT_PUBLIC_IS_CLIENT_LOG_ALLOWED !== 'true') {
            return NextResponse.json({ success: true, message: 'Logging is disabled' });
        }

        // Basic authentication check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { url, method, requestData, error, timestamp, statusCode } = body;
        const serverTimestamp = new Date().toLocaleString('en-IN', {
           timeZone: 'Asia/Kolkata',
           hour12: false,
         });
     
        const logEntry = `
                --------------------------------------------------------------------------------
                Timestamp: ${serverTimestamp}
                URL: ${url}
                Method: ${method}
                Status Code: ${statusCode}
                Request Data: ${JSON.stringify(requestData, null, 2)}
                Server Response Error: ${JSON.stringify(error, null, 2)}
                --------------------------------------------------------------------------------
                `;

        const logDir = path.join(process.cwd(), 'logs');
        const logFile = path.join(logDir, 'api-errors.log');

        // Ensure logs directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Append to log file
        fs.appendFileSync(logFile, logEntry);

        return NextResponse.json({ success: true, message: 'Error logged successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: 'Failed to log error' }, { status: 500 });
    }
}
