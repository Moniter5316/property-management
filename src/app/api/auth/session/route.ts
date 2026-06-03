import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    const isLoggedIn = session === 'authenticated';
    return NextResponse.json({ isLoggedIn });
  } catch (error: any) {
    console.error('Error checking session:', error);
    return NextResponse.json({ isLoggedIn: false });
  }
}
