const { SignJWT, jwtVerify } = require('jose');
const crypto = require('crypto');

async function test() {
  try {
    const secretKey = new TextEncoder().encode('a8f9c2e5b1d4f7a6c3e9b2d8f5a1c4e7');
    console.log('Secret length:', secretKey.length);
    
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secretKey);
      
    console.log('Token:', token);
    
    const { payload } = await jwtVerify(token, secretKey);
    console.log('Payload:', payload);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
