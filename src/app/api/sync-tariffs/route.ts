import { NextResponse } from 'next/server';
import { ingestAneelTariffs } from '@/lib/services/ingestTariffs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await ingestAneelTariffs();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
