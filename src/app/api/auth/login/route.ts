import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { SignJWT } from 'jose';

// Rate Limiter for login
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  try {
    const headerStore = await headers();
    const ip = headerStore.get('x-forwarded-for') || '127.0.0.1';
    
    // Check rate limit
    const now = Date.now();
    const rateLimitData = rateLimitMap.get(ip);
    if (rateLimitData && now < rateLimitData.resetAt) {
      if (rateLimitData.count >= 5) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again in 15 minutes.' },
          { status: 429 }
        );
      }
    } else if (rateLimitData && now >= rateLimitData.resetAt) {
      rateLimitMap.delete(ip); // reset after 15 mins
    }

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

      rateLimitMap.delete(ip); // Clear rate limit on successful login
      
      const response = NextResponse.json({ success: true, user: { role: 'admin', username } });
      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
      // Set JWT cookie as well for new auth
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
      
      return response;
    } else {
      // Record failed attempt
      const currentRateLimit = rateLimitMap.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
      rateLimitMap.set(ip, { count: currentRateLimit.count + 1, resetAt: currentRateLimit.resetAt });

      return NextResponse.json(
        { error: 'Invalid username or password' },
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
