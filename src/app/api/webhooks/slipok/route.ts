import { NextResponse } from 'next/server';
import { createPaymentTransaction } from '@/lib/dbService';

// SlipOK Webhook Payload usually contains the data directly or under a 'data' wrapper
// Since this is for LINE OA webhook, SlipOK sends a POST request here
export async function POST(request: Request) {
  try {
    // Minimal Security: Check if a token is provided in the headers (x-slipok-signature or authorization)
    const token = request.headers.get('x-slipok-signature') || request.headers.get('authorization');

    // SECURITY OVERHAUL: Strict Webhook Token Verification
    const secret = process.env.SLIPOK_WEBHOOK_SECRET;
    
    if (process.env.NODE_ENV === 'production') {
      if (!secret) {
        console.error('CRITICAL: SLIPOK_WEBHOOK_SECRET is not set in production. Webhooks disabled.');
        return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
      }
      if (token !== secret) {
        return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
      }
    } else {
      // In development, if secret is set, we check it. If not set, we allow bypass for testing.
      if (secret && token !== secret) {
        return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
      }
    }

    const body = await request.json();

    // Extract SlipOK payload fields
    // Structure depends on whether it's the direct API or webhook, 
    // but typically looks like: { data: { amount, sender: { name }, transRef, transDate, transTime, ... } }
    let amount = 0;
    let senderName = null;
    let transRef = null;
    let transDate = null;
    let transTime = null;
    
    // If the body has a nested "data" object (SlipOK format)
    const payloadData = body.data || body;
    
    if (payloadData) {
      amount = payloadData.amount ? Number(payloadData.amount) : 0;
      senderName = payloadData.sender?.name || payloadData.senderName || 'ไม่ทราบชื่อ';
      transRef = payloadData.transRef || payloadData.transactionId || null;
      transDate = payloadData.transDate || null;
      transTime = payloadData.transTime || null;
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount or missing data' }, { status: 400 });
    }

    // Save this as an UNMATCHED payment transaction
    await createPaymentTransaction({
      slipId: body.id || null, // If SlipOK provides an ID
      transRef,
      amount,
      senderName,
      transDate,
      transTime,
      status: 'UNMATCHED',
      slipImageUrl: payloadData.url || null // SECURITY OVERHAUL: Save cloud URL if available, but never save raw Base64 data to prevent DB bloat
    });

    return NextResponse.json({ success: true, message: 'Webhook received and saved as UNMATCHED' });
  } catch (error: any) {
    console.error('Error processing SlipOK webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
