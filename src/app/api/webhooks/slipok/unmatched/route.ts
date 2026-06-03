import { NextResponse } from 'next/server';
import { getPaymentTransactions } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';

export async function GET() {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await getPaymentTransactions();
    // Filter out MATCHED if we only want UNMATCHED
    const unmatched = transactions.filter(t => t.status === 'UNMATCHED');

    return NextResponse.json(unmatched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
