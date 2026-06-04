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

    const result = await matchPaymentTransaction(
      paymentTransactionId,
      billId
    );

    return NextResponse.json({
      success: true,
      message: `จับคู่สลิปสำเร็จ (สถานะ: ${result.bill?.status || 'UNKNOWN'})`,
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
