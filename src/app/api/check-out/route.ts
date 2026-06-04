import { NextResponse } from 'next/server';
import { checkOutTenant } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { roomId, endDate, finalLightMeter, finalWaterMeter, damageFee, isForfeitDeposit } = body;

    // Validation
    if (!roomId || !endDate || finalLightMeter === undefined) {
      return NextResponse.json(
        { error: 'Missing required check-out fields' },
        { status: 400 }
      );
    }

    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid endDate format' },
        { status: 400 }
      );
    }

    const result = await checkOutTenant(
      roomId,
      end,
      {
        lightMeter: Number(finalLightMeter),
        waterMeter: finalWaterMeter !== undefined ? Number(finalWaterMeter) : 0,
      },
      damageFee ? Number(damageFee) : 0,
      !!isForfeitDeposit
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error during check-out API execution:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
