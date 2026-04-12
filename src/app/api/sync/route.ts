import { NextResponse } from 'next/server';
import { syncGoogleSheets } from '@/lib/services/googleSync';

export async function GET() {
  try {
    const result = await syncGoogleSheets();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
