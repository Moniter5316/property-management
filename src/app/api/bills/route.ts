import { NextResponse } from 'next/server';
import { getBills, saveBill } from '@/lib/dbService';
import { verifyAdmin } from '@/lib/auth';
import { z } from 'zod';

const meterSchema = z.object({
  roomId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  previousLightMeter: z.number().nonnegative(),
  currentLightMeter: z.number().nonnegative(),
  lightPricePerUnit: z.number().nonnegative(),
  previousWaterMeter: z.number().nonnegative(),
  currentWaterMeter: z.number().nonnegative(),
  waterPricePerUnit: z.number().nonnegative(),
  commonFeeCharged: z.number().nonnegative().optional(),
  depositCharged: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  otherCharged: z.number().nonnegative().optional(),
  remark: z.string().optional().nullable(),
  status: z.enum(['PAID', 'UNPAID', 'PENDING', 'PARTIAL']).optional(),
  paymentSlipUrl: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const propertyId = searchParams.get('propertyId') || undefined;

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required parameters' },
        { status: 400 }
      );
    }

    const bills = await getBills(Number(month), Number(year), propertyId);
    return NextResponse.json(bills);
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    const body = await request.json();

    const parseResult = meterSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const result = await saveBill(parseResult.data as any);

    return NextResponse.json({ success: true, bill: result });
  } catch (error: any) {
    console.error('Error saving bill:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    );
  }
}
