import { BASE_URL } from '@/utils/constants';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for handling chunked file uploads
 * Proxies requests to the external API: https://trade-plus.in/TPLUSNARIMAN/api/ThirdPartyService/ImportLargeFile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { FileSeqNo, BatchNo, InputJson } = body;

    // Validate request
    if (!FileSeqNo || !BatchNo || !InputJson) {
      return NextResponse.json(
        { error: 'Missing required fields: FileSeqNo, BatchNo, or InputJson' },
        { status: 400 }
      );
    }

    // Log chunk info (for debugging)
    console.log(`Processing chunk - FileSeqNo: ${FileSeqNo}, BatchNo: ${BatchNo}`);
    console.log(`InputJson keys:`, Object.keys(InputJson));

    // Forward request to external API
    const apiUrl = `${BASE_URL}/TPLUSNARIMAN/api/ThirdPartyService/ImportLargeFile`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Get response data
    const responseData = await response.json();

    // Check if external API request was successful
    if (!response.ok) {
      console.error('External API Error:', response.status, responseData);
      return NextResponse.json(
        {
          success: false,
          error: 'External API error',
          message: responseData.message || response.statusText,
          details: responseData,
        },
        { status: response.status }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      message: 'Chunk processed successfully',
      data: responseData,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Optional: GET endpoint to check upload status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    );
  }

  // TODO: Implement logic to retrieve upload status from your database
  // This is a mock response
  return NextResponse.json({
    sessionId,
    status: 'in_progress',
    chunksProcessed: 0,
    totalChunks: 0,
    recordsProcessed: 0,
  });
}
