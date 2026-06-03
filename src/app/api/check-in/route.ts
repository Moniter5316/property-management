import { NextResponse } from 'next/server';
import { checkInTenant } from '@/lib/dbService';
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
    const { roomId, tenantName, tenantPhone, startDate, initialLightMeter, initialWaterMeter, occupantCount, depositAmount } = body;

    // Validation
    if (!roomId || !tenantName || !tenantPhone || !startDate || initialLightMeter === undefined || initialWaterMeter === undefined) {
      return NextResponse.json(
        { error: 'Missing required check-in fields' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate format' },
        { status: 400 }
      );
    }

    const result = await checkInTenant(
      roomId,
      {
        name: tenantName,
        phone: tenantPhone,
        startDate: start,
        depositAmount: depositAmount ? Number(depositAmount) : 0,
      },
      {
        lightMeter: Number(initialLightMeter),
        waterMeter: Number(initialWaterMeter),
      },
      occupantCount !== undefined ? Number(occupantCount) : undefined
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error during check-in API execution:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
