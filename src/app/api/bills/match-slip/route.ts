import { NextResponse } from 'next/server';
import { matchPaymentTransaction, getRoomById } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentTransactionId, billId, matchedAmount } = body;

    if (!paymentTransactionId || !billId || matchedAmount === undefined) {
      return NextResponse.json(
        { error: 'paymentTransactionId, billId, and matchedAmount are required' },
        { status: 400 }
      );
    }

    // Determine if it's PAID or PARTIAL
    // We should ideally fetch the bill and check the totalAmount vs matchedAmount
    // but the client will tell us the intended status or we can deduce it
    const billStatus = body.billStatus || 'PAID'; // "PAID" or "PARTIAL"

    const result = await matchPaymentTransaction(
      paymentTransactionId,
      billId,
      Number(matchedAmount),
      billStatus
    );

    return NextResponse.json({
      success: true,
      message: `จับคู่สลิปสำเร็จ (สถานะ: ${billStatus})`,
      data: result
    });
  } catch (error: any) {
    console.error('Error matching slip to bill:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
