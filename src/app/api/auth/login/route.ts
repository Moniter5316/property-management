import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'password';

    // SECURITY OVERHAUL: Block default credentials on production
    if (process.env.NODE_ENV === 'production' && expectedPassword === 'password') {
      return NextResponse.json(
        { error: 'CRITICAL SECURITY ERROR: You must change the default ADMIN_PASSWORD in environment variables for production.' },
        { status: 500 }
      );
    }

    if (username === expectedUsername && password === expectedPassword) {
      // SECURITY OVERHAUL: JWT Implementation
      const secretRaw = process.env.SESSION_SECRET;
      
      if (process.env.NODE_ENV === 'production' && !secretRaw) {
        return NextResponse.json(
          { error: 'CRITICAL SECURITY ERROR: SESSION_SECRET must be set in environment variables for production.' },
          { status: 500 }
        );
      }

      const secretKey = new TextEncoder().encode(
        secretRaw || 'fallback_development_secret_only_never_use_in_prod'
      );

      const token = await new SignJWT({ role: 'admin', username: username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // 24 hour expiration for JWT validity
        .sign(secretKey);

      const response = NextResponse.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ' });
      const cookieStore = await cookies();
      
      // Still using a session cookie (no maxAge) so it clears on browser close
      cookieStore.set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
      return response;
    } else {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Error in login API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
