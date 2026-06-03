import { NextResponse } from 'next/server';
import { resetDb } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { toEmpty } = body;

    const result = await resetDb(toEmpty === true);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error during database reset:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
