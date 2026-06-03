import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function verifyAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    
    if (!session) return false;

    // We need a fallback secret for local dev if SESSION_SECRET is missing.
    // In production, this should always be set securely.
    const secretKey = new TextEncoder().encode(
      process.env.SESSION_SECRET || 'fallback_development_secret_only_never_use_in_prod'
    );

    // Verify the JWT signature
    const { payload } = await jwtVerify(session, secretKey);
    
    // Check if the payload indicates admin role
    return payload?.role === 'admin';
  } catch (error: any) {
    // Only log if it's an unexpected server error, not just an invalid/expired cookie.
    if (error.code !== 'ERR_JWS_INVALID' && error.code !== 'ERR_JWT_EXPIRED') {
      console.error('Error verifying JWT session cookie:', error.message);
    }
    return false;
  }
}
