import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const isLoggedIn = await verifyAdmin();
    return NextResponse.json({ isLoggedIn });
  } catch (error: any) {
    console.error('Error checking session:', error);
    return NextResponse.json({ isLoggedIn: false });
  }
}
