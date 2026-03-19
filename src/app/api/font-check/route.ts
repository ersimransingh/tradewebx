import { NextRequest, NextResponse } from 'next/server';
import { getDynamicFont } from '@/utils/font-loader';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Missing font name' }, { status: 400 });
  }

  const fontConfig = getDynamicFont(name);

  return NextResponse.json(fontConfig);
}
