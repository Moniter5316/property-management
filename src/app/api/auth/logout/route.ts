import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    return response;
  } catch (error: any) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
